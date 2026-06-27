from typing import Dict, Any

def require_approval(action_type: str) -> bool:
    """Determine if an action requires explicit owner approval."""
    sensitive_actions = {
        "publish_listing",
        "confirm_booking",
        "approve_adoption",
        "update_pricing"
    }
    return action_type in sensitive_actions

def validate_assistant_response(response: str) -> bool:
    """Check if the assistant is trying to make promises it shouldn't."""
    banned_phrases = [
        "i can guarantee",
        "you are approved",
        "booking confirmed",
        "is confirmed",
        "100% safe"
    ]
    response_lower = response.lower()
    for phrase in banned_phrases:
        if phrase in response_lower:
            return False
    return True
