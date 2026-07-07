from datetime import datetime, timezone
from typing import Any, Dict

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from rag.data_loader import load_all_documents
from rag.embedder import build_vector_store, get_or_build_index
from rag.retriever import SecurityRAG

load_dotenv()

router = APIRouter(prefix="/api/rag", tags=["rag"])


class QueryRequest(BaseModel):
    question: str


rag_service = SecurityRAG()


@router.post("/query")
def query_documents(payload: QueryRequest) -> Dict[str, Any]:
    print("[api] Received RAG query request")
    try:
        result = rag_service.query(payload.question)
        return result
    except Exception as exc:
        print(f"[api] Error handling RAG query: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/ingest")
def ingest_documents() -> Dict[str, Any]:
    print("[api] Rebuilding vector store")
    try:
        index = build_vector_store()
        rag_service.index = index
        rag_service.retriever = index.as_retriever(similarity_top_k=5)
        return {"status": "rebuilt", "documents": len(load_all_documents())}
    except Exception as exc:
        print(f"[api] Error rebuilding vector store: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/stats")
def get_stats() -> Dict[str, Any]:
    print("[api] Returning RAG stats")
    try:
        documents = load_all_documents()
        return {
            "total_documents": len(documents),
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        print(f"[api] Error collecting stats: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
