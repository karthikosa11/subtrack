from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import subscriptions, summary

app = FastAPI(title="SubTrack API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(subscriptions.router)
app.include_router(summary.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
