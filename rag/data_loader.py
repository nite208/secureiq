import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv
from llama_index.core import Document

load_dotenv()

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_CVE_FILE = ROOT_DIR / "data" / "cve" / "cve_data.json"
NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"


def _read_json_file(filepath: Path) -> Dict[str, Any]:
    try:
        with open(filepath, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError:
        print(f"[data_loader] CVE file not found: {filepath}")
        raise
    except json.JSONDecodeError as exc:
        print(f"[data_loader] Failed to parse JSON from {filepath}: {exc}")
        raise


def _extract_severity(record: Dict[str, Any]) -> Optional[str]:
    try:
        metrics = record.get("containers", {}).get("cna", {}).get("metrics", [])
        if isinstance(metrics, dict):
            metrics = [metrics]
        for metric in metrics:
            if isinstance(metric, dict):
                for _, details in metric.items():
                    if isinstance(details, dict):
                        severity = details.get("baseSeverity")
                        if severity:
                            return severity
                    elif isinstance(details, list):
                        for item in details:
                            if isinstance(item, dict):
                                severity = item.get("baseSeverity")
                                if severity:
                                    return severity
                                cvss_data = item.get("cvssData")
                                if isinstance(cvss_data, dict):
                                    severity = cvss_data.get("baseSeverity")
                                    if severity:
                                        return severity
        return None
    except Exception as exc:
        print(f"[data_loader] Could not extract severity: {exc}")
        return None


def _extract_description(record: Dict[str, Any]) -> Optional[str]:
    try:
        descriptions = record.get("containers", {}).get("cna", {}).get("descriptions", [])
        for description in descriptions:
            if description.get("lang") == "en" and description.get("value"):
                return description["value"]
        if descriptions:
            return descriptions[0].get("value")
        return None
    except Exception as exc:
        print(f"[data_loader] Could not extract description: {exc}")
        return None


def load_cve_json(filepath: str | os.PathLike | None = None) -> List[Dict[str, Any]]:
    print("[data_loader] Loading CVE records from local JSON file")
    file_path = Path(filepath or DEFAULT_CVE_FILE)
    try:
        record = _read_json_file(file_path)
        cve_id = record.get("cveMetadata", {}).get("cveId")
        title = record.get("containers", {}).get("cna", {}).get("title")
        description = _extract_description(record)
        severity = _extract_severity(record)
        published_date = record.get("cveMetadata", {}).get("datePublished")

        if not cve_id:
            raise ValueError("Local CVE record is missing cveMetadata.cveId")

        return [{
            "cve_id": cve_id,
            "title": title or "Unknown",
            "description": description or "No description available",
            "severity": severity or "UNKNOWN",
            "published_date": published_date or "Unknown",
            "source": str(file_path),
        }]
    except Exception as exc:
        print(f"[data_loader] Error loading local CVE JSON: {exc}")
        return []


def fetch_cve_api(limit: int = 50) -> List[Dict[str, Any]]:
    print(f"[data_loader] Fetching up to {limit} CVE records from NVD API")
    try:
        params = {"resultsPerPage": limit}
        response = httpx.get(NVD_API_URL, params=params, timeout=30.0)
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:
        print(f"[data_loader] Error during NVD API fetch: {exc}")
        return []

    vulnerabilities = payload.get("vulnerabilities", [])
    results: List[Dict[str, Any]] = []
    for item in vulnerabilities:
        try:
            cve = item.get("cve", {})
            descriptions = cve.get("descriptions", [])
            description = None
            for detail in descriptions:
                if detail.get("lang") == "en" and detail.get("value"):
                    description = detail.get("value")
                    break
            if not description and descriptions:
                description = descriptions[0].get("value")

            severity = "UNKNOWN"
            metrics = cve.get("metrics", [])
            if isinstance(metrics, dict):
                metrics = [metrics]
            for metric in metrics:
                if isinstance(metric, dict):
                    for _, details in metric.items():
                        if isinstance(details, dict):
                            severity_value = details.get("baseSeverity")
                            if severity_value:
                                severity = severity_value
                                break
                        elif isinstance(details, list):
                            for item in details:
                                if isinstance(item, dict):
                                    severity_value = item.get("baseSeverity")
                                    if severity_value:
                                        severity = severity_value
                                        break
                                    cvss_data = item.get("cvssData")
                                    if isinstance(cvss_data, dict):
                                        severity_value = cvss_data.get("baseSeverity")
                                        if severity_value:
                                            severity = severity_value
                                            break
                        if severity != "UNKNOWN":
                            break
                if severity != "UNKNOWN":
                    break

            results.append({
                "cve_id": cve.get("id", "UNKNOWN"),
                "title": cve.get("id", "Unknown CVE"),
                "description": description or "No description available",
                "severity": severity,
                "published_date": cve.get("published"),
                "source": "NVD_API",
            })
        except Exception as exc:
            print(f"[data_loader] Could not parse CVE record from API: {exc}")

    return results


def load_all_documents() -> List[Document]:
    print("[data_loader] Building document list from local and remote CVE sources")
    documents: List[Document] = []
    seen_ids = set()

    try:
        local_records = load_cve_json(DEFAULT_CVE_FILE)
        api_records = fetch_cve_api(limit=50)
        combined_records = local_records + api_records
    except Exception as exc:
        print(f"[data_loader] Error collecting CVE records: {exc}")
        combined_records = []

    for record in combined_records:
        cve_id = record.get("cve_id", "")
        if not cve_id or cve_id in seen_ids:
            continue
        seen_ids.add(cve_id)

        text = (
            f"CVE ID: {cve_id}\n"
            f"Title: {record.get('title', 'Unknown')}\n"
            f"Severity: {record.get('severity', 'UNKNOWN')}\n"
            f"Published: {record.get('published_date', 'Unknown')}\n"
            f"Description: {record.get('description', 'No description available')}"
        )
        metadata = {
            "cve_id": cve_id,
            "title": record.get("title", "Unknown"),
            "severity": record.get("severity", "UNKNOWN"),
            "published_date": record.get("published_date", "Unknown"),
            "source": record.get("source", "Unknown"),
        }
        documents.append(Document(text=text, metadata=metadata))

    if not documents:
        print("[data_loader] No CVE documents were created")

    return documents
