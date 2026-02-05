import os
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./feedback.db"
    openai_api_key: str = ""
    guide_path: Path = Path(__file__).parent.parent / "guide" / "poetry_guide.md"

    @property
    def use_mock_ai(self) -> bool:
        """Use mock AI only if no API key is configured."""
        return not bool(self.openai_api_key)

    class Config:
        env_file = ".env"


settings = Settings()

# Also check environment variable directly
if not settings.openai_api_key:
    settings.openai_api_key = os.environ.get("OPENAI_API_KEY", "")
