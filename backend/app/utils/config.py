import os


class Settings:
    cors_origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000").split(",") if x.strip()]
    translation_provider = os.getenv("TRANSLATION_PROVIDER", "mymemory").lower()
    mymemory_email = os.getenv("MYMEMORY_EMAIL", "").strip()
    translation_timeout = float(os.getenv("TRANSLATION_TIMEOUT", "4.5"))
    enable_offline_fallback = os.getenv("ENABLE_OFFLINE_FALLBACK", "true").lower() in ("true", "1", "yes")


settings = Settings()


