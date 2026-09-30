from functools import lru_cache

import anthropic

from app.config import get_settings
from app.services.insights import InsightClient


@lru_cache
def get_insight_client() -> InsightClient:
    settings = get_settings()
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key or None)
    return InsightClient(client, settings.claude_model)
