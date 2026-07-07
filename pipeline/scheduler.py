import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv

from agents.investigation_agent import InvestigationAgent
from agents.tools import send_telegram_alert
from pipeline.anomaly_detector import AnomalyDetector
from pipeline.data_fetcher import fetch_all_feeds

load_dotenv()

ROOT_DIR = Path(__file__).resolve().parent.parent
LATEST_FEEDS_PATH = ROOT_DIR / "data" / "latest_feeds.json"
ANOMALY_RESULTS_PATH = ROOT_DIR / "data" / "anomaly_results.json"
SAMPLE_LOGS_PATH = ROOT_DIR / "data" / "sample_logs.txt"


class ThreatPipelineScheduler:
    def __init__(self) -> None:
        print("[pipeline] Creating threat pipeline scheduler")
        self.scheduler = AsyncIOScheduler()
        self.detector = AnomalyDetector()
        self.agent = InvestigationAgent()
        self.running = False
        self.last_feed_fetch = "never"
        self.last_anomaly_check = "never"

    def fetch_and_store_feeds(self) -> None:
        print("[pipeline] Running scheduled feed fetch")
        try:
            payload = fetch_all_feeds()
            LATEST_FEEDS_PATH.parent.mkdir(parents=True, exist_ok=True)
            with open(LATEST_FEEDS_PATH, "w", encoding="utf-8") as handle:
                json.dump(payload, handle, indent=2)
            self.last_feed_fetch = payload.get("fetched_at", datetime.now(timezone.utc).isoformat())

            high_risk = [item for item in payload.get("cves", []) if str(item.get("severity", "")).lower() in {"high", "critical"}]
            if high_risk:
                print(f"[pipeline] Found {len(high_risk)} high/critical CVEs; triggering investigations")
                for item in high_risk[:3]:
                    self.agent.run(f"Security advisory {item.get('cve_id')} - {item.get('description')}")
            print(f"[pipeline] Feed fetch complete: {len(payload.get('cves', []))} CVEs, {len(payload.get('news', []))} news items")
        except Exception as exc:
            print(f"[pipeline] Feed fetch job error: {exc}")

    def monitor_anomalies(self) -> None:
        print("[pipeline] Running anomaly monitoring")
        try:
            if SAMPLE_LOGS_PATH.exists():
                with open(SAMPLE_LOGS_PATH, "r", encoding="utf-8") as handle:
                    log_text = handle.read()
            else:
                log_text = ""
            result = self.detector.analyze(log_text)
            self.last_anomaly_check = datetime.now(timezone.utc).isoformat()
            if result.get("is_anomaly") and result.get("anomaly_score", 0.0) < -0.1:
                send_telegram_alert.invoke({"message": f"Anomalous server activity detected: {result}", "risk_score": 80})
            ANOMALY_RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
            with open(ANOMALY_RESULTS_PATH, "w", encoding="utf-8") as handle:
                json.dump(result, handle, indent=2)
            print(f"[pipeline] Anomaly result saved: {result}")
        except Exception as exc:
            print(f"[pipeline] Anomaly monitoring job error: {exc}")

    def start(self) -> None:
        if self.running:
            return
        print("[pipeline] Starting scheduler")
        self.scheduler.add_job(self.fetch_and_store_feeds, "interval", hours=1)
        self.scheduler.add_job(self.monitor_anomalies, "interval", minutes=30)
        self.scheduler.start()
        self.running = True

    def stop(self) -> None:
        if not self.running:
            return
        print("[pipeline] Stopping scheduler")
        self.scheduler.shutdown(wait=False)
        self.running = False
