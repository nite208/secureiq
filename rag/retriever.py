import os
from typing import Any, Dict, List

from dotenv import load_dotenv
from langchain_groq import ChatGroq

from rag.embedder import get_or_build_index

load_dotenv()


class SecurityRAG:
    def __init__(self) -> None:
        print("[retriever] Initializing SecurityRAG")
        self.index = get_or_build_index()
        self.retriever = self.index.as_retriever(similarity_top_k=5)
        self.llm = None
        try:
            api_key = os.getenv("GROQ_API_KEY")
            model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
            if api_key:
                self.llm = ChatGroq(model=model_name, api_key=api_key, temperature=0.1)
                print("[retriever] Groq model initialized")
            else:
                print("[retriever] GROQ_API_KEY not set; using local fallback response")
        except Exception as exc:
            print(f"[retriever] Error initializing Groq client: {exc}")
            self.llm = None

    def _format_context(self, nodes: List[Any]) -> str:
        if not nodes:
            return "No relevant CVE records were found."

        context_parts = []
        for index, node in enumerate(nodes, start=1):
            metadata = node.node.metadata
            context_parts.append(
                f"{index}. CVE {metadata.get('cve_id', 'UNKNOWN')} | {metadata.get('title', 'Unknown')} | "
                f"Severity: {metadata.get('severity', 'UNKNOWN')} | Published: {metadata.get('published_date', 'Unknown')}\n"
                f"{node.node.text}"
            )
        return "\n\n".join(context_parts)

    def _build_answer(self, question: str, nodes: List[Any]) -> str:
        if self.llm is None:
            if not nodes:
                return "No relevant CVE data was found to answer that question."
            context = self._format_context(nodes)
            return (
                "Based on the retrieved CVE records, the most relevant findings are:\n\n"
                f"{context}"
            )

        context = self._format_context(nodes)
        prompt = (
            "You are SecureIQ, an AI security intelligence assistant. "
            "Answer the user's question using only the provided CVE context. "
            "Be concise, factual, and mention the relevant CVE IDs.\n\n"
            f"Question: {question}\n\n"
            f"Context:\n{context}"
        )
        try:
            response = self.llm.invoke(prompt)
            return str(getattr(response, "content", response))
        except Exception as exc:
            print(f"[retriever] Error generating LLM answer: {exc}")
            return (
                "The retriever found relevant CVE records, but the LLM response could not be generated. "
                f"Context summary: {context}"
            )

    def query(self, question: str, top_k: int = 5) -> Dict[str, Any]:
        print(f"[retriever] Querying for: {question}")
        if not question or not str(question).strip():
            return {"answer": "Please provide a question.", "sources": [], "confidence": 0.0}

        try:
            retriever = self.index.as_retriever(similarity_top_k=top_k)
            nodes = retriever.retrieve(question)
            sources = []
            for node in nodes:
                metadata = node.node.metadata
                sources.append({
                    "cve_id": metadata.get("cve_id", "UNKNOWN"),
                    "title": metadata.get("title", "Unknown"),
                    "severity": metadata.get("severity", "UNKNOWN"),
                    "published_date": metadata.get("published_date", "Unknown"),
                    "score": round(float(node.score or 0.0), 4),
                })

            answer = self._build_answer(question, nodes)
            confidence = 0.0
            if nodes:
                confidence = round(min(0.99, max(0.1, float(nodes[0].score or 0.0))), 4)
            return {"answer": answer, "sources": sources, "confidence": confidence}
        except Exception as exc:
            print(f"[retriever] Error during query: {exc}")
            return {"answer": f"An error occurred while querying the CVE index: {exc}", "sources": [], "confidence": 0.0}

    def search_similar(self, description: str, top_k: int = 5) -> List[Dict[str, Any]]:
        print(f"[retriever] Searching similar CVEs for: {description}")
        try:
            retriever = self.index.as_retriever(similarity_top_k=top_k)
            nodes = retriever.retrieve(description)
            results = []
            for node in nodes:
                metadata = node.node.metadata
                results.append({
                    "cve_id": metadata.get("cve_id", "UNKNOWN"),
                    "title": metadata.get("title", "Unknown"),
                    "severity": metadata.get("severity", "UNKNOWN"),
                    "published_date": metadata.get("published_date", "Unknown"),
                    "score": round(float(node.score or 0.0), 4),
                })
            return results
        except Exception as exc:
            print(f"[retriever] Error finding similar CVEs: {exc}")
            return []
