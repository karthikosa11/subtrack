"""Claude-generated keep/downgrade/cancel advice.

Results are cached by a hash of the inputs that matter (cost, cycle and recent
usage ratings), so opening a screen never calls Claude twice for the same facts.
"""

import hashlib
import json
from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Literal, Protocol, TypeVar

import anthropic
from pydantic import BaseModel, Field

from app.models import BillingCycle, Rating
from app.services.money import cents, monthly_equivalent

RECENT_RATINGS = 5
CYCLE_UNIT = {BillingCycle.weekly: "week", BillingCycle.monthly: "month", BillingCycle.yearly: "year"}
NO_USAGE_MESSAGE ="Rate how often you use this and we'll tell you if it's worth keeping."

# Route declined requests to Anthropic's recommended fallback model server-side.
FALLBACK_HEADERS = {"anthropic-beta": "server-side-fallback-2026-07-01"}
FALLBACK_BODY = {"fallbacks": "default"}

VOICE = (
    "You write for SubTrack, an app that helps people stop paying for subscriptions they "
    "don't use. Talk to the user directly, in plain words, the way a blunt friend who is "
    "good with money would. Always mention the actual price. No jargon, no hedging, no "
    "exclamation marks, no emoji. Never say 'optimize', 'utilization' or 'leverage'."
)

INSIGHT_TASK = (
    "Decide whether the user should keep, downgrade, or cancel this subscription, based on "
    "what it costs and how often they said they used it. Newest rating first. Write at most "
    "two short sentences. Example: \"You're paying $15.99/month for this but rated it "
    "'Rarely' three times in a row. This is probably worth cancelling.\""
)

SUMMARY_TASK = (
    "Write one short note (at most three sentences) on how the user's subscription spending "
    "looks this month, then name the single subscription most worth reconsidering and why. "
    "Set focus_id to that subscription's id, or null if nothing stands out. If they haven't "
    "rated usage yet, base it on cost alone and say so briefly."
)


class InsightUnavailable(Exception):
    pass


class InsightResult(BaseModel):
    recommendation: Literal["keep", "downgrade", "cancel"]
    body: str = Field(description="At most two sentences, addressed to the user.")


class SummaryResult(BaseModel):
    body: str = Field(description="At most three sentences, addressed to the user.")
    focus_id: str | None = Field(description="id of the subscription most worth reconsidering")


@dataclass(frozen=True)
class UsageFact:
    on: date
    rating: Rating


@dataclass(frozen=True)
class SubFacts:
    id: str
    name: str
    category: str
    cost: Decimal
    cycle: BillingCycle
    ratings: Sequence[UsageFact]  # newest first, at most RECENT_RATINGS

    def as_prompt_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "price": f"${cents(self.cost)} per {CYCLE_UNIT[self.cycle]}",
            "monthly_equivalent": f"${cents(monthly_equivalent(self.cost, self.cycle))}",
            "usage_ratings": [{"date": r.on.isoformat(), "rating": r.rating.value} for r in self.ratings],
        }


def _digest(payload: object) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()


def insight_hash(facts: SubFacts) -> str:
    return _digest([str(cents(facts.cost)), facts.cycle.value, [(r.on, r.rating.value) for r in facts.ratings]])


def summary_hash(subs: Sequence[SubFacts]) -> str:
    return _digest(sorted(insight_hash(s) + s.id for s in subs))


class Cached(Protocol):
    input_hash: str


C = TypeVar("C", bound=Cached)
R = TypeVar("R")


async def resolve_cached(
    existing: C | None, input_hash: str, generate: Callable[[], Awaitable[R]]
) -> tuple[C | R | None, bool, bool]:
    """Return (value, generated, stale).

    Cache hit: the stored row. Miss: a fresh result from `generate`. If Claude
    fails and something is cached, fall back to it and mark it stale.
    """
    if existing is not None and existing.input_hash == input_hash:
        return existing, False, False
    try:
        return await generate(), True, False
    except (InsightUnavailable, anthropic.APIError):
        if existing is not None:
            return existing, False, True
        return None, False, True


class InsightClient:
    def __init__(self, client: anthropic.AsyncAnthropic, model: str):
        self.client = client
        self.model = model

    async def _parse(self, task: str, payload: object, output: type[BaseModel]) -> BaseModel:
        response = await self.client.messages.parse(
            model=self.model,
            max_tokens=2048,
            system=f"{VOICE}\n\n{task}",
            messages=[{"role": "user", "content": json.dumps(payload, indent=2)}],
            output_format=output,
            output_config={"effort": "low"},
            extra_headers=FALLBACK_HEADERS,
            extra_body=FALLBACK_BODY,
        )
        if response.stop_reason == "refusal" or response.parsed_output is None:
            raise InsightUnavailable(response.stop_reason)
        return response.parsed_output

    async def insight(self, facts: SubFacts) -> InsightResult:
        result = await self._parse(INSIGHT_TASK, facts.as_prompt_dict(), InsightResult)
        assert isinstance(result, InsightResult)
        return result

    async def summary(self, subs: Sequence[SubFacts]) -> SummaryResult:
        payload = {"subscriptions": [s.as_prompt_dict() for s in subs]}
        result = await self._parse(SUMMARY_TASK, payload, SummaryResult)
        assert isinstance(result, SummaryResult)
        if result.focus_id not in {s.id for s in subs}:
            result.focus_id = None
        return result
