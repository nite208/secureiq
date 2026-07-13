import os
from typing import Dict

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agents.api import router as agent_router
from pipeline.api import router as pipeline_router
from pipeline.scheduler import ThreatPipelineScheduler
from rag.api import router as rag_router
from rag.embedder import get_or_build_index

load_dotenv()

app = FastAPI(title="SecureIQ", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)
app.include_router(rag_router)
app.include_router(agent_router)
app.include_router(pipeline_router)

scheduler = ThreatPipelineScheduler()


@app.get("/")
def home() -> Dict[str, str]:
    return {"status": "ok", "project": "SecureIQ"}


@app.on_event("startup")
def startup_event() -> None:
    print("[main] Starting SecureIQ application")
    try:
        get_or_build_index()
        scheduler.start()
        print("[main] Startup index initialization completed")
    except Exception as exc:
        print(f"[main] Error during startup index initialization: {exc}")


@app.on_event("shutdown")
def shutdown_event() -> None:
    print("[main] Shutting down SecureIQ application")
    try:
        scheduler.stop()
    except Exception as exc:
        print(f"[main] Error stopping scheduler: {exc}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)