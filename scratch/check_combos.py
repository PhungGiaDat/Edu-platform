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

async def check_combos():
    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("MONGO_DB", "edu_platform")
    
    client = AsyncIOMotorClient(mongo_url)
    await init_beanie(database=client[db_name], document_models=[Flashcard, ARObject])
    
    # Find combos related to elephant
    combos_collection = client[db_name]["ar_combinations"]
    combos = await combos_collection.find({"model_3d_url": {"$regex": "elephant"}}).to_list(length=100)
    print(f"Found {len(combos)} elephant combos")
    
    for combo in combos:
        print(f"Combo: {combo.get('combo_id')}")
        print(f"  required_tags: {combo.get('required_tags')}")
        print(f"  model_3d_url: {combo.get('model_3d_url')}")

if __name__ == "__main__":
    asyncio.run(check_combos())
