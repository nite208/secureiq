import os
from pathlib import Path
from typing import Any, List, Optional

import chromadb
from chromadb import PersistentClient
from dotenv import load_dotenv
from llama_index.core import VectorStoreIndex
from llama_index.core.base.embeddings.base import BaseEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore
from sentence_transformers import SentenceTransformer

from rag.data_loader import load_all_documents

load_dotenv()

ROOT_DIR = Path(__file__).resolve().parent.parent
PERSIST_DIR = ROOT_DIR / "data" / "chroma_db"
COLLECTION_NAME = "secureiq_cves"


class SentenceTransformerEmbedding(BaseEmbedding):
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2", **kwargs: Any):
        super().__init__(model_name=model_name, **kwargs)
        self._model = SentenceTransformer(model_name)

    def _get_query_embedding(self, query: str) -> List[float]:
        return self._get_text_embedding(query)

    def _get_text_embedding(self, text: str) -> List[float]:
        embedding = self._model.encode([text], convert_to_numpy=True, normalize_embeddings=True)[0]
        return embedding.tolist()

    def _get_text_embeddings(self, texts: List[str]) -> List[List[float]]:
        embeddings = self._model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
        return embeddings.tolist()

    async def _aget_query_embedding(self, query: str) -> List[float]:
        return self._get_query_embedding(query)

    async def _aget_text_embedding(self, text: str) -> List[float]:
        return self._get_text_embedding(text)

    async def _aget_text_embeddings(self, texts: List[str]) -> List[List[float]]:
        return self._get_text_embeddings(texts)


def _get_embed_model() -> BaseEmbedding:
    return SentenceTransformerEmbedding()


def build_vector_store() -> VectorStoreIndex:
    print("[embedder] Building vector store from CVE documents")
    try:
        documents = load_all_documents()
        if not documents:
            raise ValueError("No documents available to index")

        PERSIST_DIR.mkdir(parents=True, exist_ok=True)
        embed_model = _get_embed_model()
        chroma_client = PersistentClient(path=str(PERSIST_DIR))
        chroma_collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)
        vector_store = ChromaVectorStore(
            chroma_collection=chroma_collection,
            collection_name=COLLECTION_NAME,
            persist_dir=str(PERSIST_DIR),
            collection_kwargs={"metadata": {"hnsw:space": "cosine"}},
        )
        index = VectorStoreIndex.from_vector_store(vector_store=vector_store, embed_model=embed_model)
        for document in documents:
            index.insert(document)
        print(f"[embedder] Vector store built and persisted to {PERSIST_DIR}")
        return index
    except Exception as exc:
        print(f"[embedder] Error building vector store: {exc}")
        raise


def load_vector_store() -> VectorStoreIndex:
    print("[embedder] Loading existing vector store from disk")
    try:
        if not PERSIST_DIR.exists() or not any(PERSIST_DIR.iterdir()):
            raise FileNotFoundError("No persisted Chroma directory found")

        embed_model = _get_embed_model()
        chroma_client = PersistentClient(path=str(PERSIST_DIR))
        chroma_collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)
        vector_store = ChromaVectorStore(
            chroma_collection=chroma_collection,
            collection_name=COLLECTION_NAME,
            persist_dir=str(PERSIST_DIR),
            collection_kwargs={"metadata": {"hnsw:space": "cosine"}},
        )
        index = VectorStoreIndex.from_vector_store(vector_store=vector_store, embed_model=embed_model)
        print(f"[embedder] Loaded vector store from {PERSIST_DIR}")
        return index
    except Exception as exc:
        print(f"[embedder] Error loading vector store: {exc}")
        raise


def get_or_build_index() -> VectorStoreIndex:
    try:
        return load_vector_store()
    except Exception as exc:
        print(f"[embedder] Falling back to rebuild because load failed: {exc}")
        return build_vector_store()
