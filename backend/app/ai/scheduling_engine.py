import datetime
from typing import Optional, TypedDict

WEEKDAYS = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
}

TIME_OF_DAY_DEFAULTS = {
    "morning": "09:00",
    "lunchtime": "12:00",
    "afternoon": "14:00",
    "evening": "18:00",
    "night": "19:00",
}

MAX_CONFLICT_SHIFT_DAYS = 14


class BookingResolution(TypedDict):
    proposed_date: Optional[str]
    proposed_time: Optional[str]
    confidence: int
    shifted_due_to_conflict: bool


def resolve_relative_day(reference: Optional[str], today: datetime.date) -> Optional[datetime.date]:
    """Deterministically resolve phrases like 'next_wednesday', 'this_saturday',
    'tomorrow', 'this_week' into a real calendar date computed from `today`.
    This never touches the LLM — calendar arithmetic must be exact, and a
    small model asked to compute "next Wednesday" gives inconsistent answers
    for the same request (confirmed empirically: two near-identical enquiries
    asking about "next Wednesday" got different dates back)."""
    if not reference:
        return None
    ref = reference.lower().strip()

    if ref == "today":
        return today
    if ref == "tomorrow":
        return today + datetime.timedelta(days=1)
    if ref in ("this_week", "flexible", "asap", "soon"):
        return today

    for prefix, extra_weeks in (("next_", 1), ("this_", 0)):
        if ref.startswith(prefix):
            day_name = ref[len(prefix):]
            if day_name in WEEKDAYS:
                target_weekday = WEEKDAYS[day_name]
                days_ahead = (target_weekday - today.weekday()) % 7
                # "this_<day>": soonest occurrence, 0-6 days out (today counts
                # if today already is that weekday). "next_<day>": always the
                # following week's occurrence, 7-13 days out — a fixed,
                # documented interpretation that removes the ambiguity around
                # whether "next Wednesday" means this week's or next week's.
                days_ahead += 7 * extra_weeks
                return today + datetime.timedelta(days=days_ahead)
    return None


def resolve_booking(
    *,
    explicit_date: Optional[str],
    relative_day: Optional[str],
    time_of_day: Optional[str],
    explicit_time: Optional[str],
    today: datetime.date,
    booked_dates: set[str],
) -> BookingResolution:
    """Turn the LLM's extracted intent into an actual date/time. All
    arithmetic (weekday resolution, conflict shifting, past-date rejection)
    happens here in plain code — the LLM never computes a final date itself."""
    date_obj: Optional[datetime.date] = None

    if explicit_date:
        try:
            date_obj = datetime.date.fromisoformat(explicit_date)
        except ValueError:
            date_obj = None

    if date_obj is None:
        date_obj = resolve_relative_day(relative_day, today)

    if date_obj is None or date_obj < today:
        return {
            "proposed_date": None,
            "proposed_time": None,
            "confidence": 0,
            "shifted_due_to_conflict": False,
        }

    time_str = explicit_time or TIME_OF_DAY_DEFAULTS.get((time_of_day or "").lower(), "10:00")

    original_date = date_obj
    shifts = 0
    while date_obj.isoformat() in booked_dates and shifts < MAX_CONFLICT_SHIFT_DAYS:
        date_obj += datetime.timedelta(days=1)
        shifts += 1

    shifted = date_obj != original_date
    confidence = 100 if explicit_date else (90 if relative_day else 60)
    if shifted:
        confidence = max(50, confidence - 20)

    return {
        "proposed_date": date_obj.isoformat(),
        "proposed_time": time_str,
        "confidence": confidence,
        "shifted_due_to_conflict": shifted,
    }
