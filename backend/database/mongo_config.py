# mongo_config.py
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
MONGO_DB = os.getenv("MONGO_DB")

# Validate required environment variables
if not MONGO_URL:
    raise ValueError("MONGO_URL environment variable is required")
if not MONGO_DB:
    raise ValueError("MONGO_DB environment variable is required")


print(f"[DB] Database: {MONGO_DB}")
