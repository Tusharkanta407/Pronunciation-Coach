import os
from pathlib import Path

from dotenv import load_dotenv

# Always prefer values from backend/.env (fixes stale keys after uvicorn reload)
_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(_ENV_PATH, override=True)


def groq_api_key() -> str:
    return os.getenv("GROQ_API_KEY", "").strip().strip('"')


def openrouter_api_key() -> str:
    return (
        os.getenv("OPENROUTER_API_KEY", "").strip().strip('"')
        or os.getenv("OPENAI_API_KEY", "").strip().strip('"')
    )
