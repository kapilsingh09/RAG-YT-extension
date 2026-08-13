import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    HF_API_KEY: str | None = os.getenv("HF_API_KEY")

settings = Settings()
