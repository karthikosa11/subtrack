import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app import repo
from app.auth import current_user_id, local_today
from app.db import get_session
from app.deps import get_insight_client
from app.models import Decision, Insight, Recommendation, Status, Subscription, UsageLog
from app.schemas import (
    DecisionIn,
    InsightOut,
    SubscriptionIn,
    SubscriptionOut,
    SubscriptionPatch,
    UsageIn,
)
from app.services.insights import NO_USAGE_MESSAGE, InsightClient, insight_hash, resolve_cached

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


async def _one(session: AsyncSession, user_id: uuid.UUID, sub: Subscription, today: date) -> SubscriptionOut:
    ratings = await repo.recent_ratings(session, user_id, [sub.id])
    return repo.to_out(sub, ratings.get(sub.id, []), today)


@router.get("", response_model=list[SubscriptionOut])
async def list_subscriptions(
    user_id: uuid.UUID = Depends(current_user_id),
    today: date = Depends(local_today),
    session: AsyncSession = Depends(get_session),
):
    subs = await repo.list_subscriptions(session, user_id)
    ratings = await repo.recent_ratings(session, user_id, [s.id for s in subs])
    out = [repo.to_out(s, ratings.get(s.id, []), today) for s in subs]
    active = sorted((s for s in out if s.status == Status.active), key=lambda s: (s.next_renewal, s.name))
    cancelled = sorted(
        (s for s in out if s.status == Status.cancelled),
        key=lambda s: s.cancelled_on or date.min,
        reverse=True,
    )
    return active + cancelled


@router.post("", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    body: SubscriptionIn,
    user_id: uuid.UUID = Depends(current_user_id),
    today: date = Depends(local_today),
    session: AsyncSession = Depends(get_session),
):
    sub = Subscription(
        user_id=user_id,
        name=body.name.strip(),
        cost=body.cost,
        currency=body.currency.upper(),
        billing_cycle=body.billing_cycle,
        category=body.category,
        renewal_anchor=body.renewal_date,
    )
    session.add(sub)
    await session.commit()
    return repo.to_out(sub, [], today)


@router.get("/{sub_id}", response_model=SubscriptionOut)
async def get_subscription(
    sub_id: uuid.UUID,
    user_id: uuid.UUID = Depends(current_user_id),
    today: date = Depends(local_today),
    session: AsyncSession = Depends(get_session),
):
    sub = await repo.get_owned(session, user_id, sub_id)
    return await _one(session, user_id, sub, today)


@router.patch("/{sub_id}", response_model=SubscriptionOut)
async def update_subscription(
    sub_id: uuid.UUID,
    body: SubscriptionPatch,
    user_id: uuid.UUID = Depends(current_user_id),
    today: date = Depends(local_today),
    session: AsyncSession = Depends(get_session),
):
    sub = await repo.get_owned(session, user_id, sub_id)
    changes = body.model_dump(exclude_unset=True, exclude_none=True)
    if "renewal_date" in changes:
        sub.renewal_anchor = changes.pop("renewal_date")
    if "name" in changes:
        changes["name"] = changes["name"].strip()
    for field, value in changes.items():
        setattr(sub, field, value)
    await session.commit()
    return await _one(session, user_id, sub, today)


@router.delete("/{sub_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subscription(
    sub_id: uuid.UUID,
    user_id: uuid.UUID = Depends(current_user_id),
    session: AsyncSession = Depends(get_session),
):
    sub = await repo.get_owned(session, user_id, sub_id)
    await session.delete(sub)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{sub_id}/usage", response_model=SubscriptionOut)
async def log_usage(
    sub_id: uuid.UUID,
    body: UsageIn,
    user_id: uuid.UUID = Depends(current_user_id),
    today: date = Depends(local_today),
    session: AsyncSession = Depends(get_session),
):
    sub = await repo.get_owned(session, user_id, sub_id)
    # One rating per day; rating again the same day replaces it.
    stmt = insert(UsageLog).values(
        id=uuid.uuid4(), subscription_id=sub.id, user_id=user_id, rating=body.rating, logged_on=today
    )
    await session.execute(
        stmt.on_conflict_do_update(constraint="uq_usage_one_per_day", set_={"rating": stmt.excluded.rating})
    )
    await session.commit()
    return await _one(session, user_id, sub, today)


@router.post("/{sub_id}/decision", response_model=SubscriptionOut)
async def record_decision(
    sub_id: uuid.UUID,
    body: DecisionIn,
    user_id: uuid.UUID = Depends(current_user_id),
    today: date = Depends(local_today),
    session: AsyncSession = Depends(get_session),
):
    sub = await repo.get_owned(session, user_id, sub_id)
    sub.decision = body.decision
    sub.decided_at = datetime.now(timezone.utc)
    if body.decision == Decision.cancelled:
        if sub.status != Status.cancelled:
            sub.status = Status.cancelled
            sub.cancelled_on = today
    else:
        sub.status = Status.active
        sub.cancelled_on = None
    await session.commit()
    return await _one(session, user_id, sub, today)


@router.get("/{sub_id}/insight", response_model=InsightOut)
async def get_insight(
    sub_id: uuid.UUID,
    user_id: uuid.UUID = Depends(current_user_id),
    session: AsyncSession = Depends(get_session),
    claude: InsightClient = Depends(get_insight_client),
):
    sub = await repo.get_owned(session, user_id, sub_id)
    ratings = (await repo.recent_ratings(session, user_id, [sub.id])).get(sub.id, [])
    if not ratings:
        return InsightOut(recommendation=None, body=NO_USAGE_MESSAGE)

    facts = repo.facts_for(sub, ratings)
    input_hash = insight_hash(facts)
    existing = await session.get(Insight, sub.id)
    value, generated, stale = await resolve_cached(existing, input_hash, lambda: claude.insight(facts))

    if value is None:
        return InsightOut(recommendation=None, body=None, stale=True)
    if generated:
        await session.merge(
            Insight(
                subscription_id=sub.id,
                recommendation=Recommendation(value.recommendation),
                body=value.body,
                input_hash=input_hash,
                model=claude.model,
                generated_at=datetime.now(timezone.utc),
            )
        )
        await session.commit()
    return InsightOut(recommendation=Recommendation(value.recommendation), body=value.body, stale=stale)
