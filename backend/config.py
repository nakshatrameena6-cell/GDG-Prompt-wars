import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Search for .env in project root or current working dir
root_dir = Path(__file__).resolve().parent.parent
env_paths = [
    root_dir / ".env",
    Path(__file__).resolve().parent / ".env",
    Path(".env"),
]

for env_path in env_paths:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        break
else:
    load_dotenv()  # Fallback to default load_dotenv behavior


class Settings:
    @property
    def GEMINI_API_KEY(self) -> str:
        return os.getenv("GEMINI_API_KEY", "").strip()

    @property
    def GEMINI_MODEL(self) -> str:
        return os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()

    @property
    def GEMINI_FALLBACK_MODEL(self) -> str:
        return os.getenv("GEMINI_FALLBACK_MODEL", "gemini-1.5-flash-8b").strip()

    @property
    def DB_PATH(self) -> str:
        return os.getenv("DB_PATH", "backend/data/app.db").strip()

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").strip()
        if not raw:
            return ["http://localhost:5173"]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    @property
    def LLM_DISABLED(self) -> bool:
        raw = os.getenv("LLM_DISABLED", "true").strip().lower()
        return raw in ("true", "1", "yes", "t")

    @property
    def APP_NAME(self) -> str:
        return "PlacementPilot API"

    @property
    def APP_VERSION(self) -> str:
        return "1.0.0-phase1"


settings = Settings()
