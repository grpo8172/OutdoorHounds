import datetime
from typing import Any, Dict

from sqlalchemy.orm import Session

from app.ai.scheduling_engine import resolve_booking
from app.llm.factory import get_llm_provider
from app.models import domain as models
from app.policy.guardrails import validate_assistant_response

FALLBACK: Dict[str, Any] = {
    "proposed_date": None,
    "proposed_time": None,
    "ai_confidence": 0,
    "ai_reasoning": "AI scheduling unavailable — needs manual review.",
}

RELATIVE_DAY_VOCAB = (
    "today, tomorrow, this_week, flexible, "
    "this_monday, this_tuesday, this_wednesday, this_thursday, this_friday, this_saturday, this_sunday, "
    "next_monday, next_tuesday, next_wednesday, next_thursday, next_friday, next_saturday, next_sunday"
)


def _booked_dates(db: Session, item_id: int, exclude_enquiry_id: int) -> list[str]:
    rows = (
        db.query(models.Enquiry)
        .filter(
            models.Enquiry.item_id == item_id,
            models.Enquiry.id != exclude_enquiry_id,
            models.Enquiry.status.in_(["approved", "ai_proposed"]),
        )
        .all()
    )
    dates = set()
    for row in rows:
        if row.status == "approved" and row.booking_date:
            dates.add(row.booking_date)
        elif row.status == "ai_proposed" and row.proposed_date:
            dates.add(row.proposed_date)
    return sorted(dates)


def propose_booking(db: Session, enquiry: models.Enquiry, item: models.CatalogueItem) -> Dict[str, Any]:
    """The LLM extracts scheduling intent from the customer's free-text
    message (what it's good at); a deterministic scheduling engine
    (app.ai.scheduling_engine) turns that intent into an actual date/time and
    resolves conflicts (what code is good at — an LLM asked to compute
    "next Wednesday" directly gave inconsistent answers for near-identical
    requests, confirmed empirically). Never raises — falls back to a
    manual-review result if the LLM is unavailable or returns something
    unusable, so enquiry creation never breaks."""
    today = datetime.date.today()
    booked = _booked_dates(db, item.id, enquiry.id)

    prompt = f"""You are the booking-scheduling agent for a pet-services business called Outdoor Hounds.

Today's date is {today.isoformat()}.

A customer submitted this enquiry for the listing "{item.name}" ({item.item_type}): "{enquiry.message}"

Extract their scheduling intent — do NOT compute an actual calendar date yourself, just describe what they asked for:
- explicit_date: an ISO "YYYY-MM-DD" date ONLY if the customer stated a specific calendar date (e.g. "August 15th"). Otherwise null.
- relative_day: one of [{RELATIVE_DAY_VOCAB}] if the customer referred to a day relatively (e.g. "next Wednesday" -> "next_wednesday", "this coming Saturday" -> "this_saturday"). Otherwise null.
- time_of_day: one of [morning, lunchtime, afternoon, evening, night] if implied. Otherwise null.
- explicit_time: an exact "HH:MM" ONLY if the customer stated a specific time. Otherwise null.
- reasoning: one sentence describing what the customer asked for and why.

Respond with ONLY a JSON object of this exact shape:
{{"explicit_date": "YYYY-MM-DD or null", "relative_day": "one of the vocab words or null", "time_of_day": "one of the vocab words or null", "explicit_time": "HH:MM or null", "reasoning": "<one sentence>"}}
"""

    try:
        result = get_llm_provider().generate_json(prompt)
    except Exception:
        return dict(FALLBACK)

    resolution = resolve_booking(
        explicit_date=result.get("explicit_date"),
        relative_day=result.get("relative_day"),
        time_of_day=result.get("time_of_day"),
        explicit_time=result.get("explicit_time"),
        today=today,
        booked_dates=set(booked),
    )

    if not resolution["proposed_date"]:
        return dict(FALLBACK)

    reasoning = str(result.get("reasoning") or "")[:500]
    if not reasoning or not validate_assistant_response(reasoning):
        reasoning = "Proposed based on listing availability."
    if resolution["shifted_due_to_conflict"]:
        reasoning += " The customer's originally requested date was already booked, so the next available date was chosen instead."

    return {
        "proposed_date": resolution["proposed_date"],
        "proposed_time": resolution["proposed_time"],
        "ai_confidence": resolution["confidence"],
        "ai_reasoning": reasoning,
    }
