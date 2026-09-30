from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from types import SimpleNamespace

import anthropic
import httpx
import pytest

from app.models import BillingCycle, Rating
from app.services.insights import (
    InsightClient,
    InsightResult,
    InsightUnavailable,
    SubFacts,
    SummaryResult,
    UsageFact,
    insight_hash,
    resolve_cached,
    summary_hash,
)


def facts(*ratings: Rating, cost="15.99", sub_id="a") -> SubFacts:
    return SubFacts(
        id=sub_id,
        name="Netflix",
        category="streaming",
        cost=Decimal(cost),
        cycle=BillingCycle.monthly,
        ratings=tuple(UsageFact(on=date(2026, 9, 29 - i), rating=r) for i, r in enumerate(ratings)),
    )


@dataclass
class Row:
    input_hash: str
    body: str


class FakeMessages:
    def __init__(self, parsed, stop_reason="end_turn"):
        self.calls = 0
        self.parsed = parsed
        self.stop_reason = stop_reason
        self.kwargs = None

    async def parse(self, **kwargs):
        self.calls += 1
        self.kwargs = kwargs
        return SimpleNamespace(parsed_output=self.parsed, stop_reason=self.stop_reason)


def fake_client(parsed, stop_reason="end_turn") -> InsightClient:
    return InsightClient(SimpleNamespace(messages=FakeMessages(parsed, stop_reason)), "claude-opus-5")


def test_hash_changes_with_a_new_rating_but_not_with_name():
    base = facts(Rating.rarely)
    assert insight_hash(base) == insight_hash(facts(Rating.rarely))
    assert insight_hash(base) != insight_hash(facts(Rating.often, Rating.rarely))
    assert insight_hash(base) != insight_hash(facts(Rating.rarely, cost="9.99"))


def test_summary_hash_ignores_order():
    a, b = facts(Rating.rarely, sub_id="a"), facts(Rating.often, sub_id="b")
    assert summary_hash([a, b]) == summary_hash([b, a])


async def test_cache_hit_skips_claude():
    client = fake_client(InsightResult(recommendation="cancel", body="new"))
    f = facts(Rating.rarely)
    cached = Row(input_hash=insight_hash(f), body="cached")

    value, generated, stale = await resolve_cached(cached, insight_hash(f), lambda: client.insight(f))

    assert value is cached and not generated and not stale
    assert client.client.messages.calls == 0


async def test_new_rating_regenerates_once():
    client = fake_client(InsightResult(recommendation="cancel", body="new"))
    old = facts(Rating.rarely)
    new = facts(Rating.rarely, Rating.rarely)
    cached = Row(input_hash=insight_hash(old), body="cached")

    value, generated, _ = await resolve_cached(cached, insight_hash(new), lambda: client.insight(new))

    assert generated and value.body == "new"
    assert client.client.messages.calls == 1
    sent = client.client.messages.kwargs
    assert sent["output_format"] is InsightResult
    assert sent["extra_body"] == {"fallbacks": "default"}


async def test_claude_failure_falls_back_to_stale_cache():
    async def boom():
        request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
        raise anthropic.APIConnectionError(request=request)

    cached = Row(input_hash="old", body="cached")
    value, generated, stale = await resolve_cached(cached, "new", boom)
    assert value is cached and not generated and stale

    value, generated, stale = await resolve_cached(None, "new", boom)
    assert value is None and stale


async def test_refusal_raises_unavailable():
    client = fake_client(None, stop_reason="refusal")
    with pytest.raises(InsightUnavailable):
        await client.insight(facts(Rating.rarely))


async def test_summary_drops_unknown_focus_id():
    client = fake_client(SummaryResult(body="ok", focus_id="not-a-real-id"))
    result = await client.summary([facts(Rating.rarely, sub_id="a")])
    assert result.focus_id is None
