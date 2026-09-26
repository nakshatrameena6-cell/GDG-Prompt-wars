import os
from pathlib import Path
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
        # Strictly load from environment variable
        return os.getenv("GEMINI_API_KEY", "").strip()

    @property
    def GEMINI_MODEL(self) -> str:
        return os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()

    @property
    def APP_NAME(self) -> str:
        return "PlacementPilot API"

    @property
    def APP_VERSION(self) -> str:
        return "1.0.0-phase1"

settings = Settings()
