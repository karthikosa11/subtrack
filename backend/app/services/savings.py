"""Money saved by cancelling.

A cancelled subscription saves one charge for every renewal it would have hit
since the day it was cancelled. The first skipped renewal counts straight away:
cancelling before a charge is the whole point, so the number moves the moment
the user logs it.
"""

from collections.abc import Iterable
from datetime import date
from decimal import Decimal

from app.models import BillingCycle, Status, Subscription
from app.services.money import cents
from app.services.renewals import next_renewal, renewals_between


def saved_by(
    cost: Decimal, anchor: date, cycle: BillingCycle, cancelled_on: date, today: date
) -> Decimal:
    first_skipped = next_renewal(anchor, cycle, cancelled_on)
    later = sum(1 for d in renewals_between(anchor, cycle, first_skipped, today) if d > first_skipped)
    return cost * (1 + later)


def total_saved(subs: Iterable[Subscription], today: date) -> Decimal:
    total = Decimal(0)
    for s in subs:
        if s.status == Status.cancelled and s.cancelled_on is not None:
            total += saved_by(s.cost, s.renewal_anchor, s.billing_cycle, s.cancelled_on, today)
    return cents(total)
