"""
migrate_cross_category_flag.py

Migration: Set cross_category_allowed=True for existing cross-category combos.

Run from backend/:
    python scripts/migrate_cross_category_flag.py
"""
import asyncio
import sys
from pathlib import Path

import certifi
import motor.motor_asyncio
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")
sys.path.insert(0, str(BACKEND_DIR))

from settings import settings

# Patterns that indicate cross-category combos (e.g., jungle, ecosystem, nature)
TARGET_PATTERNS = ['jungle', 'ecosystem', 'nature', 'eco', 'animal', 'plant']


async def migrate_cross_category_combos() -> int:
    """
    Set cross_category_allowed=True for existing combos that likely span categories.

    This handles combos like:
    - elephant (animals) + tree (plants) = jungle ecosystem

    Returns:
        Number of combos updated
    """
    client = motor.motor_asyncio.AsyncIOMotorClient(
        settings.MONGO_URL,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=10_000,
    )

    try:
        await client.admin.command("ping")
        db = client[settings.MONGO_DB]
        ar_combinations = db["ar_combinations"]

        print("[Migration] Starting cross_category_allowed migration...")

        updated_count = 0

        for pattern in TARGET_PATTERNS:
            # Match combos where description or combo_id contains the pattern
            query = {
                "$or": [
                    {"description": {"$regex": pattern, "$options": "i"}},
                    {"combo_id": {"$regex": pattern, "$options": "i"}}
                ],
                "$or": [
                    {"cross_category_allowed": {"$exists": False}},
                    {"cross_category_allowed": None},
                    {"cross_category_allowed": False}
                ]
            }

            cursor = ar_combinations.find(query)
            async for combo in cursor:
                combo_id = combo.get("combo_id", "unknown")
                result = await ar_combinations.update_one(
                    {"_id": combo["_id"]},
                    {"$set": {"cross_category_allowed": True}}
                )
                if result.modified_count > 0:
                    updated_count += 1
                    print(f"  [Migration] Updated: {combo_id}")

        print(f"[Migration] Complete. Updated {updated_count} combos.")
        return updated_count

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(migrate_cross_category_combos())
