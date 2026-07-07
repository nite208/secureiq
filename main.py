import os
from typing import Dict

from dotenv import load_dotenv
from fastapi import FastAPI

from rag.api import router as rag_router
from rag.embedder import get_or_build_index

load_dotenv()

app = FastAPI(title="SecureIQ", version="1.0.0")
app.include_router(rag_router)


@app.get("/")
def home() -> Dict[str, str]:
    return {"status": "ok", "project": "SecureIQ"}


@app.on_event("startup")
def startup_event() -> None:
    print("[main] Starting SecureIQ application")
    try:
        get_or_build_index()
        print("[main] Startup index initialization completed")
    except Exception as exc:
        print(f"[main] Error during startup index initialization: {exc}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)