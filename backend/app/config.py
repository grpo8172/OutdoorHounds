from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    project_name: str = "Outdoor Hounds API"
    database_url: str = "sqlite:///./data/outdoor_hounds.db"
    
    # LLM Configuration
    llm_enabled: bool = False
    llm_provider: str = "mock"  # "mock", "openai", "gemini"
    llm_model: str = "mock-model-v1"
    llm_max_tokens: int = 1000
    
    # Optional API Keys
    openai_api_key: str | None = None
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

def get_settings() -> Settings:
    return Settings()
