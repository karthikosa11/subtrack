"""Queries shared by the routers. Every one is scoped to the signed-in user."""

import uuid
from collections import defaultdict
from collections.abc import Sequence
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Status, Subscription, UsageLog
from app.schemas import LastRating, SubscriptionOut
from app.services.insights import RECENT_RATINGS, SubFacts, UsageFact
from app.services.money import monthly_equivalent
from app.services.renewals import days_until, next_renewal
from app.services.savings import saved_by


async def list_subscriptions(
    session: AsyncSession, user_id: uuid.UUID, only: Status | None = None
) -> Sequence[Subscription]:
    query = select(Subscription).where(Subscription.user_id == user_id)
    if only is not None:
        query = query.where(Subscription.status == only)
    return (await session.scalars(query)).all()


async def get_owned(session: AsyncSession, user_id: uuid.UUID, sub_id: uuid.UUID) -> Subscription:
    sub = await session.get(Subscription, sub_id)
    if sub is None or sub.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "That subscription doesn't exist.")
    return sub


async def recent_ratings(
    session: AsyncSession, user_id: uuid.UUID, sub_ids: Sequence[uuid.UUID]
) -> dict[uuid.UUID, list[UsageFact]]:
    """Newest-first ratings per subscription, at most RECENT_RATINGS each."""
    out: dict[uuid.UUID, list[UsageFact]] = defaultdict(list)
    if not sub_ids:
        return out
    rows = await session.scalars(
        select(UsageLog)
        .where(UsageLog.user_id == user_id, UsageLog.subscription_id.in_(sub_ids))
        .order_by(UsageLog.logged_on.desc())
    )
    for row in rows:
        bucket = out[row.subscription_id]
        if len(bucket) < RECENT_RATINGS:
            bucket.append(UsageFact(on=row.logged_on, rating=row.rating))
    return out


def facts_for(sub: Subscription, ratings: list[UsageFact]) -> SubFacts:
    return SubFacts(
        id=str(sub.id),
        name=sub.name,
        category=sub.category.value,
        cost=sub.cost,
        cycle=sub.billing_cycle,
        ratings=tuple(ratings),
    )


def to_out(sub: Subscription, ratings: list[UsageFact], today: date) -> SubscriptionOut:
    renews = next_renewal(sub.renewal_anchor, sub.billing_cycle, today)
    saved = (
        saved_by(sub.cost, sub.renewal_anchor, sub.billing_cycle, sub.cancelled_on, today)
        if sub.status == Status.cancelled and sub.cancelled_on
        else 0
    )
    return SubscriptionOut(
        id=sub.id,
        name=sub.name,
        cost=float(sub.cost),
        currency=sub.currency,
        billing_cycle=sub.billing_cycle,
        category=sub.category,
        monthly_cost=round(float(monthly_equivalent(sub.cost, sub.billing_cycle)), 2),
        next_renewal=renews,
        days_until_renewal=days_until(renews, today),
        status=sub.status,
        decision=sub.decision,
        cancelled_on=sub.cancelled_on,
        saved=float(saved),
        ratings=[LastRating(rating=r.rating, on=r.on) for r in ratings],
        rated_today=bool(ratings) and ratings[0].on == today,
    )
