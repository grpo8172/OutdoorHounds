import json
import re
import httpx
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

class GeminiAPIProvider:
    """Calls Gemini through Google AI Studio's Generative Language API
    (generativelanguage.googleapis.com) using a plain API key — this has a
    genuine free tier with no GCP billing account required, unlike Vertex AI."""

    def __init__(self, api_key: str, model_name: str):
        self.api_key = api_key
        self.model_name = model_name

    def generate_json(self, prompt: str) -> Dict[str, Any]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent"
        response = httpx.post(
            url,
            params={"key": self.api_key},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"},
            },
            timeout=30.0,
        )
        response.raise_for_status()
        text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Occasionally still wraps JSON in a ```json fence even with
            # responseMimeType set — salvage it before giving up.
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            raise

class HuggingFaceProvider:
    """Calls Hugging Face's Inference Providers router (OpenAI-compatible
    chat-completions shape) — no Google billing involved. Billed in
    fractions of a cent per call against HF's account-level free monthly
    inference credit; not literally $0 like a no-billing-required tier, but
    cheap enough that hackathon-scale traffic won't exhaust it."""

    def __init__(self, api_token: str, model_id: str):
        self.api_token = api_token
        self.model_id = model_id

    def generate_json(self, prompt: str) -> Dict[str, Any]:
        url = "https://router.huggingface.co/v1/chat/completions"
        response = httpx.post(
            url,
            headers={"Authorization": f"Bearer {self.api_token}"},
            json={
                "model": self.model_id,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=60.0,
        )
        response.raise_for_status()
        text = response.json()["choices"][0]["message"]["content"]
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Chat models often wrap JSON in a ```json fence even when asked
            # for JSON only — salvage it before giving up.
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            raise

def get_llm_provider() -> LLMProvider:
    settings = get_settings()
    if not settings.llm_enabled:
        return MockLLMProvider()
    if settings.llm_provider == "huggingface" and settings.hf_api_token:
        return HuggingFaceProvider(settings.hf_api_token, settings.hf_model)
    if settings.llm_provider == "gemini" and settings.gemini_api_key:
        return GeminiAPIProvider(settings.gemini_api_key, settings.gemini_model)
    return MockLLMProvider()
