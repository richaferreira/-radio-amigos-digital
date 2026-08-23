import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-change-me")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///radio.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    REDIS_URL = os.getenv("REDIS_URL", "memory://")
    RATELIMIT_STORAGE_URI = REDIS_URL
    RATELIMIT_DEFAULT = "300 per hour"
    STREAM_URL = os.getenv("STREAM_URL", "")
    STREAM_STATUS_URL = os.getenv("STREAM_STATUS_URL", "")
    STREAM_PROVIDER = os.getenv("STREAM_PROVIDER", "azuracast")
    SITE_NAME = os.getenv("SITE_NAME", "Rádio Amigos Digital")
    BASE_URL = os.getenv("BASE_URL", "http://localhost:5000")
    UPLOAD_FOLDER = str(BASE_DIR / os.getenv("UPLOAD_FOLDER", "uploads"))
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 8 * 1024 * 1024))
    JWT_ACCESS_TOKEN_EXPIRES = 60 * 60 * 8
