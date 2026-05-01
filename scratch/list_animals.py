import asyncio
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from dotenv import load_dotenv

# Setup paths
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / "backend" / ".env")
sys.path.append(str(BASE_DIR / "backend"))

from models.flashcard import Flashcard

async def list_animals():
    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("MONGO_DB", "edu_platform")
    
    client = AsyncIOMotorClient(mongo_url)
    await init_beanie(database=client[db_name], document_models=[Flashcard])
    
    cards = await Flashcard.find({"category": "animals"}).to_list()
    print(f"Found {len(cards)} animal flashcards:")
    for c in cards:
        print(f"- {c.word} (ar_tag: {c.ar_tag})")

if __name__ == "__main__":
    asyncio.run(list_animals())
