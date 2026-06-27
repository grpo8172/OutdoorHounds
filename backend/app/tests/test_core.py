from app.policy.guardrails import require_approval, validate_assistant_response
from app.llm.factory import MockLLMProvider, get_llm_provider


def test_sensitive_actions_require_approval():
    assert require_approval("confirm_booking") is True
    assert require_approval("approve_adoption") is True
    assert require_approval("view_listing") is False


def test_assistant_response_blocks_overpromising():
    assert validate_assistant_response("Your booking is confirmed!") is False
    assert validate_assistant_response("You are approved for adoption") is False
    assert validate_assistant_response("Here are our available hikes.") is True


def test_mock_llm_returns_setup_fixture():
    provider = MockLLMProvider()
    result = provider.generate_json("setup: my pet business")
    assert "name" in result
    assert "suggested_items" in result


def test_factory_defaults_to_mock():
    provider = get_llm_provider()
    assert isinstance(provider, MockLLMProvider)
