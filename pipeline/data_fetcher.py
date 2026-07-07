import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

import feedparser
import httpx
from dotenv import load_dotenv

load_dotenv()

NVD_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
RSS_URLS = [
    "https://feeds.feedburner.com/TheHackersNews",
    "https://www.bleepingcomputer.com/feed/",
]


def fetch_cve_feed() -> List[Dict[str, Any]]:
    print("[pipeline] Fetching CVE feed from NVD")
    try:
        seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S.000")
        response = httpx.get(NVD_URL, params={"resultsPerPage": 20, "pubStartDate": seven_days_ago}, timeout=30.0)
        response.raise_for_status()
        payload = response.json()
        vulnerabilities = payload.get("vulnerabilities", [])
        results = []
        for item in vulnerabilities:
            cve = item.get("cve", {})
            descriptions = cve.get("descriptions", [])
            description = next((d.get("value") for d in descriptions if d.get("lang") == "en" and d.get("value")), None)
            if not description and descriptions:
                description = descriptions[0].get("value")
            severity = "UNKNOWN"
            metrics = cve.get("metrics", [])
            if isinstance(metrics, list):
                for metric in metrics:
                    if isinstance(metric, dict):
                        for _, value in metric.items():
                            if isinstance(value, dict):
                                severity_value = value.get("baseSeverity")
                                if severity_value:
                                    severity = severity_value
                                    break
                        if severity != "UNKNOWN":
                            break
            results.append({
                "cve_id": cve.get("id", "UNKNOWN"),
                "description": description or "No description available",
                "severity": severity,
                "published_date": cve.get("published", "Unknown"),
            })
        return results
    except Exception as exc:
        print(f"[pipeline] CVE feed fetch warning: {exc}")
        return []


def fetch_security_news() -> List[Dict[str, Any]]:
    print("[pipeline] Fetching security news RSS feed")
    try:
        feed = feedparser.parse(RSS_URLS[0])
        entries = feed.entries[:10]
        results = []
        for entry in entries:
            results.append({
                "title": getattr(entry, "title", "Untitled"),
                "summary": getattr(entry, "summary", ""),
                "link": getattr(entry, "link", ""),
                "published": getattr(entry, "published", ""),
            })
        return results
    except Exception as exc:
        print(f"[pipeline] Primary RSS feed failed, trying backup: {exc}")
        try:
            feed = feedparser.parse(RSS_URLS[1])
            entries = feed.entries[:10]
            results = []
            for entry in entries:
                results.append({
                    "title": getattr(entry, "title", "Untitled"),
                    "summary": getattr(entry, "summary", ""),
                    "link": getattr(entry, "link", ""),
                    "published": getattr(entry, "published", ""),
                })
            return results
        except Exception as backup_exc:
            print(f"[pipeline] Security news fetch warning: {backup_exc}")
            return []


def fetch_all_feeds() -> Dict[str, Any]:
    print("[pipeline] Fetching all threat intelligence feeds")
    try:
        cves = fetch_cve_feed()
        news = fetch_security_news()
        return {
            "cves": cves,
            "news": news,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        print(f"[pipeline] Error combining feeds: {exc}")
        return {"cves": [], "news": [], "fetched_at": datetime.now(timezone.utc).isoformat()}
