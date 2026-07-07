import os
from typing import Any, Dict, List

import httpx
from dotenv import load_dotenv
from langchain.tools import tool

from rag.retriever import SecurityRAG

load_dotenv()

rag = SecurityRAG()


@tool
def search_knowledge_base(query: str) -> str:
    """Search the local SecureIQ CVE knowledge base for relevant incidents."""
    try:
        result = rag.query(query)
        answer = result.get("answer", "No answer available")
        sources = result.get("sources", [])
        if not sources:
            return answer
        source_lines = [f"- {item.get('cve_id', 'UNKNOWN')}: {item.get('title', 'Unknown')}" for item in sources[:5]]
        return f"{answer}\n\nSources:\n" + "\n".join(source_lines)
    except Exception as exc:
        print(f"[agents.tools] search_knowledge_base error: {exc}")
        return f"Knowledge base search unavailable: {exc}"


@tool
def calculate_risk_score(event_type: str, severity: str, time_of_day: int, zone: str) -> Dict[str, Any]:
    """Calculate a risk score from event characteristics."""
    try:
        event_weights = {
            "weapon": 85,
            "fire": 90,
            "intrusion": 70,
            "loitering": 50,
            "anomaly": 40,
        }
        severity_multipliers = {
            "critical": 2.0,
            "high": 1.5,
            "medium": 1.2,
            "low": 1.0,
        }
        base_score = event_weights.get(event_type.lower(), 35)
        multiplier = severity_multipliers.get(severity.lower(), 1.0)
        score = int(min(100, round(base_score * multiplier)))

        if 22 <= time_of_day or time_of_day <= 6:
            score = min(100, score + 15)
        if zone.lower() == "restricted":
            score = min(100, score + 20)
        elif zone.lower() == "public":
            score = min(100, score + 5)

        if score >= 80:
            severity_level = "critical"
            recommendation = "Escalate immediately and notify security response"
        elif score >= 60:
            severity_level = "high"
            recommendation = "Dispatch a rapid review and alert on-duty personnel"
        elif score >= 35:
            severity_level = "medium"
            recommendation = "Monitor closely and log the event"
        else:
            severity_level = "low"
            recommendation = "Continue routine monitoring"

        return {"score": score, "severity_level": severity_level, "recommendation": recommendation}
    except Exception as exc:
        print(f"[agents.tools] calculate_risk_score error: {exc}")
        return {"score": 0, "severity_level": "low", "recommendation": "Unable to calculate risk"}


@tool
def send_telegram_alert(message: str, risk_score: int) -> str:
    """Send a formatted alert to Telegram if credentials are available."""
    try:
        token = os.getenv("TELEGRAM_BOT_TOKEN")
        chat_id = os.getenv("TELEGRAM_CHAT_ID")
        if not token or not chat_id:
            return "telegram credentials missing"

        payload = {
            "chat_id": chat_id,
            "text": f"🚨 SecureIQ Alert\n{message}\nRisk Score: {risk_score}/100",
            "parse_mode": "HTML",
        }
        response = httpx.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json=payload,
            timeout=15.0,
        )
        response.raise_for_status()
        return "sent"
    except Exception as exc:
        print(f"[agents.tools] send_telegram_alert error: {exc}")
        return f"telegram error: {exc}"


@tool
def search_web(query: str) -> str:
    """Search the web for recent threat context using DuckDuckGo."""
    try:
        response = httpx.get("https://ddgs.chat/search", params={"q": query}, timeout=20.0)
        response.raise_for_status()
        payload = response.json()
        results = payload.get("results", [])[:3]
        if not results:
            return "Web search unavailable"
        formatted = []
        for item in results:
            title = item.get("title", "Untitled")
            url = item.get("url", "")
            snippet = item.get("body", "")
            formatted.append(f"- {title}\n  {url}\n  {snippet}")
        return "\n\n".join(formatted)
    except Exception as exc:
        print(f"[agents.tools] search_web error: {exc}")
        return "Web search unavailable"
