import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from pipeline.anomaly_detector import AnomalyDetector

load_dotenv()

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])
ROOT_DIR = Path(__file__).resolve().parent.parent
LATEST_FEEDS_PATH = ROOT_DIR / "data" / "latest_feeds.json"
ANOMALY_RESULTS_PATH = ROOT_DIR / "data" / "anomaly_results.json"
SAMPLE_LOGS_PATH = ROOT_DIR / "data" / "sample_logs.txt"

detector = AnomalyDetector()


class LogRequest(BaseModel):
    log_text: str


class TrainRequest(BaseModel):
    logs: List[str]


@router.get("/feeds")
def get_feeds() -> Dict[str, Any]:
    print("[pipeline.api] Returning latest feeds")
    try:
        if not LATEST_FEEDS_PATH.exists():
            return {"cves": [], "news": [], "fetched_at": "never"}
        with open(LATEST_FEEDS_PATH, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception as exc:
        print(f"[pipeline.api] Error reading feeds: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/anomaly/analyze")
def analyze_sample_logs() -> Dict[str, Any]:
    print("[pipeline.api] Analyzing sample logs")
    try:
        if not SAMPLE_LOGS_PATH.exists():
            return {"is_anomaly": False, "anomaly_score": 0.0, "features": {}, "severity": "low"}
        with open(SAMPLE_LOGS_PATH, "r", encoding="utf-8") as handle:
            return detector.analyze(handle.read())
    except Exception as exc:
        print(f"[pipeline.api] Error analyzing sample logs: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/anomaly/analyze")
def analyze_custom_logs(payload: LogRequest) -> Dict[str, Any]:
    print("[pipeline.api] Analyzing custom log text")
    try:
        return detector.analyze(payload.log_text)
    except Exception as exc:
        print(f"[pipeline.api] Error analyzing custom logs: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/anomaly/train")
def train_detector(payload: TrainRequest) -> Dict[str, Any]:
    print("[pipeline.api] Training anomaly detector")
    try:
        detector.train_on_logs(payload.logs)
        return {"status": "trained"}
    except Exception as exc:
        print(f"[pipeline.api] Error training anomaly detector: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/status")
def get_status() -> Dict[str, Any]:
    print("[pipeline.api] Returning pipeline status")
    try:
        last_feed_fetch = "never"
        last_anomaly_check = "never"
        if LATEST_FEEDS_PATH.exists():
            with open(LATEST_FEEDS_PATH, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
            last_feed_fetch = payload.get("fetched_at", last_feed_fetch)
        if ANOMALY_RESULTS_PATH.exists():
            with open(ANOMALY_RESULTS_PATH, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
            last_anomaly_check = payload.get("checked_at", last_anomaly_check)
        return {"scheduler_running": False, "last_feed_fetch": last_feed_fetch, "last_anomaly_check": last_anomaly_check, "total_cves_tracked": 0}
    except Exception as exc:
        print(f"[pipeline.api] Error reading status: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
