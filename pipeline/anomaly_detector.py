import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import joblib
from dotenv import load_dotenv
from sklearn.ensemble import IsolationForest

load_dotenv()

ROOT_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT_DIR / "data" / "anomaly_model.pkl"


class AnomalyDetector:
    def __init__(self) -> None:
        print("[pipeline] Initializing anomaly detector")
        self.model = None
        self.contamination = 0.1
        self.model_path = MODEL_PATH
        if self.model_path.exists():
            try:
                self.model = joblib.load(self.model_path)
                print("[pipeline] Loaded anomaly model from disk")
            except Exception as exc:
                print(f"[pipeline] Could not load anomaly model: {exc}")
                self.model = IsolationForest(contamination=self.contamination, random_state=42)
        else:
            self.model = IsolationForest(contamination=self.contamination, random_state=42)

    def extract_features(self, log_text: str) -> List[float]:
        try:
            text = (log_text or "").lower()
            failed_attempts = sum(1 for token in re.findall(r"\bfailed\b|\berror\b", text))
            ip_matches = re.findall(r"\d+\.\d+\.\d+\.\d+", log_text or "")
            unique_ips = len(set(ip_matches))
            request_count = max(1, len((log_text or "").splitlines()))
            hour_of_day = datetime.now(timezone.utc).hour
            has_admin = 1 if ("admin" in text or "root" in text) else 0
            return [failed_attempts, unique_ips, request_count, hour_of_day, has_admin]
        except Exception as exc:
            print(f"[pipeline] Error extracting features: {exc}")
            return [0.0, 0.0, 1.0, datetime.now(timezone.utc).hour, 0]

    def analyze(self, log_text: str) -> Dict[str, Any]:
        print("[pipeline] Analyzing log text for anomalies")
        try:
            features = self.extract_features(log_text)
            failed_attempts = int(features[0])
            unique_ips = int(features[1])
            request_count = int(features[2])
            has_admin = int(features[4])

            if self.model is None:
                self.model = IsolationForest(contamination=self.contamination, random_state=42)

            if not hasattr(self.model, "estimators_"):
                self._fit_dummy_model()

            prediction = self.model.predict([features])[0]
            isolation_score = float(self.model.decision_function([features])[0])

            rule_score = 0.0
            if failed_attempts >= 3:
                rule_score += 30
            if has_admin == 1 and failed_attempts >= 2:
                rule_score += 25
            if unique_ips >= 2 and failed_attempts >= 3:
                rule_score += 20
            if request_count >= 10 and has_admin == 1:
                rule_score += 15

            final_score = max(isolation_score, rule_score)
            is_anomaly = bool(final_score > 50)

            if final_score > 70:
                severity = "critical"
            elif final_score > 50:
                severity = "high"
            elif final_score > 30:
                severity = "medium"
            else:
                severity = "low"

            return {
                "is_anomaly": is_anomaly,
                "anomaly_score": round(final_score, 4),
                "features": {
                    "failed_attempts": failed_attempts,
                    "unique_ips": unique_ips,
                    "request_count": request_count,
                    "hour_of_day": int(features[3]),
                    "has_admin": has_admin,
                },
                "severity": severity,
            }
        except Exception as exc:
            print(f"[pipeline] Analysis error: {exc}")
            return {"is_anomaly": False, "anomaly_score": 0.0, "features": {}, "severity": "low"}

    def train_on_logs(self, log_texts: List[str]) -> None:
        print("[pipeline] Training anomaly detector on provided logs")
        try:
            features = [self.extract_features(text) for text in log_texts if text]
            if len(features) < 2:
                features = [self.extract_features("normal access login success"), self.extract_features("normal access login success")]
            self.model = IsolationForest(contamination=self.contamination, random_state=42)
            self.model.fit(features)
            self.model_path.parent.mkdir(parents=True, exist_ok=True)
            joblib.dump(self.model, self.model_path)
            print(f"[pipeline] Saved anomaly model to {self.model_path}")
        except Exception as exc:
            print(f"[pipeline] Training error: {exc}")

    def _fit_dummy_model(self) -> None:
        try:
            dummy_data = [
                [0.0, 1.0, 5.0, 10.0, 0.0],
                [0.0, 1.0, 6.0, 11.0, 0.0],
                [1.0, 2.0, 12.0, 15.0, 1.0],
            ]
            self.model.fit(dummy_data)
        except Exception as exc:
            print(f"[pipeline] Dummy fit failed: {exc}")
