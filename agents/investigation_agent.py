import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any, Dict, List, TypedDict

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph

from agents.tools import calculate_risk_score, search_knowledge_base, search_web, send_telegram_alert

load_dotenv()

ROOT_DIR = Path(__file__).resolve().parent.parent
HISTORY_PATH = ROOT_DIR / "data" / "investigation_history.json"


class InvestigationState(TypedDict, total=False):
    input: str
    event_type: str
    severity: str
    location: str
    timestamp: str
    knowledge_results: str
    risk_score: int
    risk_details: Dict[str, Any]
    web_results: str
    report: str
    alert_sent: bool


class InvestigationAgent:
    def __init__(self) -> None:
        print("[agents] Initializing investigation agent")
        self.llm = None
        try:
            api_key = os.getenv("GROQ_API_KEY")
            model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
            if api_key:
                self.llm = ChatGroq(model=model_name, api_key=api_key, temperature=0.1)
                print("[agents] Groq client ready")
            else:
                print("[agents] GROQ_API_KEY missing; using fallback parsing")
        except Exception as exc:
            print(f"[agents] Error initializing Groq client: {exc}")
            self.llm = None

        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(InvestigationState)
        workflow.add_node("analyze_input", self._analyze_input)
        workflow.add_node("search_knowledge", self._search_knowledge)
        workflow.add_node("assess_risk", self._assess_risk)
        workflow.add_node("search_context", self._search_context)
        workflow.add_node("generate_report", self._generate_report)
        workflow.add_node("send_alert", self._send_alert)
        workflow.set_entry_point("analyze_input")
        workflow.add_edge("analyze_input", "search_knowledge")
        workflow.add_edge("search_knowledge", "assess_risk")
        workflow.add_conditional_edges(
            "assess_risk",
            self._should_search_context,
            {"search_context": "search_context", "generate_report": "generate_report"},
        )
        workflow.add_edge("search_context", "generate_report")
        workflow.add_edge("generate_report", "send_alert")
        workflow.add_edge("send_alert", END)
        return workflow.compile()

    def _analyze_input(self, state: InvestigationState) -> InvestigationState:
        print("[agents] Node: analyze_input")
        text = state.get("input", "")
        try:
            if self.llm is not None:
                prompt = (
                    "Extract structured fields from this security alert. Return JSON with keys: "
                    "event_type, severity, location, timestamp.\n\nAlert:\n" + text
                )
                response = self.llm.invoke(prompt)
                content = str(getattr(response, "content", response))
                parsed = self._extract_json(content)
            else:
                parsed = self._fallback_parse(text)

            state["event_type"] = parsed.get("event_type", "anomaly")
            state["severity"] = parsed.get("severity", "medium")
            state["location"] = parsed.get("location", "unknown")
            state["timestamp"] = parsed.get("timestamp", datetime.now(timezone.utc).isoformat())
        except Exception as exc:
            print(f"[agents] analyze_input error: {exc}")
            state["event_type"] = "anomaly"
            state["severity"] = "medium"
            state["location"] = "unknown"
            state["timestamp"] = datetime.now(timezone.utc).isoformat()
        return state

    def _search_knowledge(self, state: InvestigationState) -> InvestigationState:
        print("[agents] Node: search_knowledge")
        try:
            query = f"{state.get('event_type', 'anomaly')} in {state.get('location', 'unknown')}"
            state["knowledge_results"] = search_knowledge_base.invoke({"query": query})
        except Exception as exc:
            print(f"[agents] search_knowledge error: {exc}")
            state["knowledge_results"] = "Knowledge base search unavailable"
        return state

    def _assess_risk(self, state: InvestigationState) -> InvestigationState:
        print("[agents] Node: assess_risk")
        try:
            result = calculate_risk_score.invoke({
                "event_type": state.get("event_type", "anomaly"),
                "severity": state.get("severity", "medium"),
                "time_of_day": self._extract_hour(state.get("timestamp", "")),
                "zone": self._infer_zone(state.get("location", "unknown")),
            })
            state["risk_details"] = result
            state["risk_score"] = int(result.get("score", 0))
        except Exception as exc:
            print(f"[agents] assess_risk error: {exc}")
            state["risk_details"] = {"score": 0, "severity_level": "low", "recommendation": "Unable to calculate risk"}
            state["risk_score"] = 0
        return state

    def _search_context(self, state: InvestigationState) -> InvestigationState:
        print("[agents] Node: search_context")
        try:
            query = f"recent threat context for {state.get('event_type', 'anomaly')} in {state.get('location', 'unknown')}"
            state["web_results"] = search_web.invoke({"query": query})
        except Exception as exc:
            print(f"[agents] search_context error: {exc}")
            state["web_results"] = "Web search unavailable"
        return state

    def _generate_report(self, state: InvestigationState) -> InvestigationState:
        print("[agents] Node: generate_report")
        try:
            if self.llm is not None:
                prompt = (
                    "Write a concise incident investigation report in plain English. "
                    "Include summary, evidence, risk assessment, and recommended next steps.\n\n"
                    f"Alert: {state.get('input', '')}\n"
                    f"Event type: {state.get('event_type', 'anomaly')}\n"
                    f"Severity: {state.get('severity', 'medium')}\n"
                    f"Location: {state.get('location', 'unknown')}\n"
                    f"Knowledge results: {state.get('knowledge_results', '')}\n"
                    f"Risk score: {state.get('risk_score', 0)}\n"
                    f"Web context: {state.get('web_results', '')}"
                )
                response = self.llm.invoke(prompt)
                state["report"] = str(getattr(response, "content", response))
            else:
                state["report"] = (
                    f"Incident summary: {state.get('input', '')}\n"
                    f"Event type: {state.get('event_type', 'anomaly')}\n"
                    f"Severity: {state.get('severity', 'medium')}\n"
                    f"Location: {state.get('location', 'unknown')}\n"
                    f"Risk score: {state.get('risk_score', 0)}\n"
                    f"Knowledge: {state.get('knowledge_results', '')}"
                )
        except Exception as exc:
            print(f"[agents] generate_report error: {exc}")
            state["report"] = "Unable to generate incident report"
        return state

    def _send_alert(self, state: InvestigationState) -> InvestigationState:
        print("[agents] Node: send_alert")
        try:
            risk_score = int(state.get("risk_score", 0))
            if risk_score > 50:
                message = state.get("report", "Security incident detected")
                result = send_telegram_alert.invoke({"message": message, "risk_score": risk_score})
                state["alert_sent"] = str(result).lower() == "sent"
            else:
                state["alert_sent"] = False
        except Exception as exc:
            print(f"[agents] send_alert error: {exc}")
            state["alert_sent"] = False
        return state

    def _should_search_context(self, state: InvestigationState) -> str:
        score = int(state.get("risk_score", 0))
        return "search_context" if score > 50 else "generate_report"

    def _extract_json(self, text: str) -> Dict[str, Any]:
        try:
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1 and end > start:
                return json.loads(text[start:end + 1])
        except Exception as exc:
            print(f"[agents] JSON parsing error: {exc}")
        return {}

    def _fallback_parse(self, text: str) -> Dict[str, Any]:
        lower_text = text.lower()
        event_type = "anomaly"
        if "weapon" in lower_text:
            event_type = "weapon"
        elif "fire" in lower_text:
            event_type = "fire"
        elif "intrusion" in lower_text:
            event_type = "intrusion"
        elif "loiter" in lower_text:
            event_type = "loitering"

        severity = "medium"
        if "critical" in lower_text:
            severity = "critical"
        elif "high" in lower_text:
            severity = "high"
        elif "low" in lower_text:
            severity = "low"

        location = "unknown"
        if "restricted" in lower_text:
            location = "restricted area"
        elif "lobby" in lower_text or "entrance" in lower_text:
            location = "public area"

        return {"event_type": event_type, "severity": severity, "location": location, "timestamp": datetime.now(timezone.utc).isoformat()}

    def _extract_hour(self, timestamp: str) -> int:
        try:
            if timestamp.endswith("Z"):
                timestamp = timestamp[:-1] + "+00:00"
            parsed = datetime.fromisoformat(timestamp)
            return parsed.hour
        except Exception:
            return 12

    def _infer_zone(self, location: str) -> str:
        location_lower = location.lower()
        if "restricted" in location_lower or "server" in location_lower or "lab" in location_lower:
            return "restricted"
        return "public"

    def run(self, alert: str) -> Dict[str, Any]:
        print(f"[agents] Running investigation for: {alert}")
        result = self.graph.invoke({"input": alert})
        self._save_history(alert, result)
        return {
            "report": result.get("report", ""),
            "risk_score": int(result.get("risk_score", 0)),
            "alert_sent": bool(result.get("alert_sent", False)),
            "event_type": result.get("event_type", "anomaly"),
            "severity": result.get("severity", "medium"),
        }

    def _save_history(self, alert: str, result: Dict[str, Any]) -> None:
        try:
            HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
            history = []
            if HISTORY_PATH.exists():
                with open(HISTORY_PATH, "r", encoding="utf-8") as handle:
                    history = json.load(handle)
            if not isinstance(history, list):
                history = []

            history.append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "alert": alert,
                "report": result.get("report", ""),
                "risk_score": int(result.get("risk_score", 0)),
                "alert_sent": bool(result.get("alert_sent", False)),
                "event_type": result.get("event_type", "anomaly"),
                "severity": result.get("severity", "medium"),
            })
            history = history[-10:]
            with open(HISTORY_PATH, "w", encoding="utf-8") as handle:
                json.dump(history, handle, indent=2)
        except Exception as exc:
            print(f"[agents] history save error: {exc}")
