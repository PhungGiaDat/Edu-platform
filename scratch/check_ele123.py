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
from models.ar_object import ARObject

async def check():
    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("MONGO_DB", "edu_platform")
    
    client = AsyncIOMotorClient(mongo_url)
    await init_beanie(database=client[db_name], document_models=[Flashcard, ARObject])
    
    card = await Flashcard.find_one({"qr_id": "ele123"})
    print(f"Flashcard: {card.word if card else 'None'}")
    if card:
        print(f"  ar_tag: {card.ar_tag}")
        obj = await ARObject.find_one({"ar_tag": card.ar_tag})
        print(f"  ARObject found: {bool(obj)}")
        if obj:
            print(f"  nft_base_url: {obj.nft_base_url}")
            print(f"  model_3d_url: {obj.model_3d_url}")
            print(f"  texture_url: {obj.texture_url}")
            print(f"  image_2d_url: {obj.image_2d_url}")
            print(f"  position: {obj.position}")
            print(f"  rotation: {obj.rotation}")
            print(f"  scale: {obj.scale}")

if __name__ == "__main__":
    asyncio.run(check())
