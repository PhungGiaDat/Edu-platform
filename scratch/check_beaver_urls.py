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

from models.pet import PetDocument

async def check_beaver():
    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("MONGO_DB", "edu_platform")
    
    client = AsyncIOMotorClient(mongo_url)
    await init_beanie(database=client[db_name], document_models=[PetDocument])
    
    pet = await PetDocument.find_one({"pet_id": "cube_beaver"})
    if pet:
        print(f"MODEL_URL:   {pet.model_url}")
        print(f"TEXTURE_URL: {pet.texture_url}")
        print(f"THUMB_URL:   {pet.thumbnail_url}")
    else:
        print("Beaver not found")

if __name__ == "__main__":
    asyncio.run(check_beaver())
