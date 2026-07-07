import json
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agents.investigation_agent import InvestigationAgent

load_dotenv()

router = APIRouter(prefix="/api/agent", tags=["agent"])
agent = InvestigationAgent()


class InvestigationRequest(BaseModel):
    alert: str


HISTORY_PATH = Path(__file__).resolve().parent.parent / "data" / "investigation_history.json"


@router.post("/investigate")
def investigate(payload: InvestigationRequest) -> Dict[str, Any]:
    print("[agents.api] Received investigation request")
    try:
        result = agent.run(payload.alert)
        return result
    except Exception as exc:
        print(f"[agents.api] Error running investigation: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/history")
def history() -> List[Dict[str, Any]]:
    print("[agents.api] Returning investigation history")
    try:
        if not HISTORY_PATH.exists():
            return []
        with open(HISTORY_PATH, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        return data if isinstance(data, list) else []
    except Exception as exc:
        print(f"[agents.api] Error reading history: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
