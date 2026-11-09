from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./studyroom.db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # JWT
    SECRET_KEY: str = "changeme-use-secrets-token-hex-32-in-production"
    ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    
    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    
    # App
    APP_NAME: str = "Collaborative Study Room"
    DEBUG: bool = True
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "https://your-frontend.vercel.app"]
    
    class Config:
        env_file = (".env", "../.env")
        env_file_encoding = "utf-8"

settings = Settings()
