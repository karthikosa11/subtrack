import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app import repo
from app.auth import current_user_id, local_today
from app.db import get_session
from app.deps import get_insight_client
from app.models import Status, Summary
from app.schemas import CategoryStat, NoteOut, SummaryOut
from app.services.insights import InsightClient, resolve_cached, summary_hash
from app.services.money import annual_total, category_totals, monthly_total
from app.services.savings import total_saved

router = APIRouter(tags=["summary"])


@router.get("/summary", response_model=SummaryOut)
async def get_summary(
    user_id: uuid.UUID = Depends(current_user_id),
    today: date = Depends(local_today),
    session: AsyncSession = Depends(get_session),
):
    subs = await repo.list_subscriptions(session, user_id)
    active = [s for s in subs if s.status == Status.active]
    return SummaryOut(
        monthly_total=float(monthly_total(active)),
        annual_total=float(annual_total(active)),
        money_saved=float(total_saved(subs, today)),
        active_count=len(active),
    )


@router.get("/summary/note", response_model=NoteOut)
async def get_note(
    user_id: uuid.UUID = Depends(current_user_id),
    session: AsyncSession = Depends(get_session),
    claude: InsightClient = Depends(get_insight_client),
):
    """The Smart Summary. Split from /summary so the totals never wait on Claude."""
    active = await repo.list_subscriptions(session, user_id, only=Status.active)
    if not active:
        return NoteOut(body=None, focus_subscription_id=None, focus_name=None)

    ratings = await repo.recent_ratings(session, user_id, [s.id for s in active])
    facts = [repo.facts_for(s, ratings.get(s.id, [])) for s in active]
    input_hash = summary_hash(facts)
    existing = await session.get(Summary, user_id)
    value, generated, stale = await resolve_cached(existing, input_hash, lambda: claude.summary(facts))

    if value is None:
        return NoteOut(body=None, focus_subscription_id=None, focus_name=None, stale=True)

    if generated:
        focus_id = uuid.UUID(value.focus_id) if value.focus_id else None
        await session.merge(
            Summary(
                user_id=user_id,
                body=value.body,
                focus_subscription_id=focus_id,
                input_hash=input_hash,
                generated_at=datetime.now(timezone.utc),
            )
        )
        await session.commit()
    else:
        focus_id = value.focus_subscription_id

    names = {s.id: s.name for s in active}
    return NoteOut(
        body=value.body,
        focus_subscription_id=focus_id if focus_id in names else None,
        focus_name=names.get(focus_id) if focus_id else None,
        stale=stale,
    )


@router.get("/stats/categories", response_model=list[CategoryStat])
async def get_category_stats(
    user_id: uuid.UUID = Depends(current_user_id),
    session: AsyncSession = Depends(get_session),
):
    active = await repo.list_subscriptions(session, user_id, only=Status.active)
    totals = category_totals(active)
    counts: dict = {}
    for s in active:
        counts[s.category] = counts.get(s.category, 0) + 1
    stats = [CategoryStat(category=c, monthly_total=float(v), count=counts[c]) for c, v in totals.items()]
    return sorted(stats, key=lambda s: s.monthly_total, reverse=True)
