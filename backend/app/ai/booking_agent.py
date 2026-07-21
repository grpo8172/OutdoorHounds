import datetime
from typing import Any, Dict

from sqlalchemy.orm import Session

from app.llm.factory import get_llm_provider
from app.models import domain as models
from app.policy.guardrails import validate_assistant_response

FALLBACK: Dict[str, Any] = {
    "proposed_date": None,
    "proposed_time": None,
    "ai_confidence": 0,
    "ai_reasoning": "AI scheduling unavailable — needs manual review.",
}


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
    """Ask the AI to propose a date/time for this enquiry, avoiding conflicts
    with the listing's other approved/proposed bookings. Never raises —
    falls back to a manual-review result if the LLM is unavailable, down, or
    returns something unusable, so enquiry creation never breaks."""
    today = datetime.date.today()
    booked = _booked_dates(db, item.id, enquiry.id)

    prompt = f"""You are the booking-scheduling agent for a pet-services business called Outdoor Hounds.

Today's date is {today.isoformat()}.

A customer submitted this enquiry for the listing "{item.name}" ({item.item_type}): "{enquiry.message}"

Dates already booked or proposed for this same listing: {booked or "none"}.

Propose the best available date and time for this booking. Prefer a date the
customer explicitly mentioned in their message if one is present and not
already taken; otherwise propose the soonest reasonable available date.
Never propose a date that is already booked/proposed or in the past.

Respond with ONLY a JSON object of this exact shape:
{{"proposed_date": "YYYY-MM-DD", "proposed_time": "HH:MM", "confidence": <integer 0-100>, "reasoning": "<one sentence explaining the choice>"}}
"""

    try:
        result = get_llm_provider().generate_json(prompt)
    except Exception:
        return dict(FALLBACK)

    proposed_date = result.get("proposed_date")
    if not proposed_date or proposed_date in booked or proposed_date < today.isoformat():
        return dict(FALLBACK)

    reasoning = str(result.get("reasoning") or "")[:500]
    if not reasoning or not validate_assistant_response(reasoning):
        reasoning = "Proposed based on listing availability."

    try:
        confidence = max(0, min(100, int(result.get("confidence", 0))))
    except (TypeError, ValueError):
        confidence = 0

    proposed_time = result.get("proposed_time")
    if not isinstance(proposed_time, str) or len(proposed_time) > 5:
        proposed_time = None

    return {
        "proposed_date": proposed_date,
        "proposed_time": proposed_time,
        "ai_confidence": confidence,
        "ai_reasoning": reasoning,
    }
