from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    project_name: str = "Outdoor Hounds API"
    database_url: str = "sqlite:///./data/outdoor_hounds.db"
    
    # LLM Configuration
    llm_enabled: bool = False
    llm_provider: str = "mock"  # "mock", "openai", "gemini", "huggingface"
    llm_model: str = "mock-model-v1"
    llm_max_tokens: int = 1000

    # Optional API Keys
    openai_api_key: str | None = None

    # Gemini via Google AI Studio's free-tier API — used by the booking agent
    # when llm_provider="gemini". No GCP billing account required (unlike
    # Vertex AI). Get a key at aistudio.google.com/apikey.
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash"

    # Hugging Face's free serverless Inference API — used when
    # llm_provider="huggingface". No Google billing involved at all; just a
    # free HF account + access token from huggingface.co/settings/tokens.
    hf_api_token: str | None = None
    hf_model: str = "google/gemma-3-4b-it"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

def get_settings() -> Settings:
    return Settings()
