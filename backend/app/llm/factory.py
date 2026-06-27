from typing import Protocol, Dict, Any
from app.config import get_settings

class LLMProvider(Protocol):
    def generate_json(self, prompt: str) -> Dict[str, Any]:
        ...

class MockLLMProvider:
    def generate_json(self, prompt: str) -> Dict[str, Any]:
        if "setup" in prompt.lower():
            return {
                "name": "Outdoor Hounds",
                "description": "Premium pet sitting and group hikes for adventurous dogs.",
                "suggested_items": [
                    {"item_type": "hike", "name": "Weekend Group Hike", "description": "2-hour guided hike."},
                    {"item_type": "pet", "name": "Bella", "description": "Energetic rescue dog looking for a home."}
                ]
            }
        return {"response": "Mock response generated."}

class RealLLMProvider:
    def __init__(self, api_key: str):
        self.api_key = api_key
        
    def generate_json(self, prompt: str) -> Dict[str, Any]:
        # Implementation for OpenAI/Gemini would go here
        return {"error": "Real LLM not fully implemented in MVP"}

def get_llm_provider() -> LLMProvider:
    settings = get_settings()
    if not settings.llm_enabled or settings.llm_provider == "mock":
        return MockLLMProvider()
    return RealLLMProvider(api_key=settings.openai_api_key or "")
