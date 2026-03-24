"""
add_all_free_pets_to_admin.py — Migration script to add all free pets to admin account.

Run from the backend/ directory:
    python -m database.migrations.add_all_free_pets_to_admin

Purpose:
    Grant admin user access to ALL pets with unlock_condition.type="free".
    This ensures admin can test all free pets without manual unlocking.

Safety:
    - Idempotent: Safe to run multiple times (uses $addToSet)
    - Dynamically queries all free pets from database
    - Only modifies admin user (admin@eduplatform.com)
    - Logs all operations for audit trail
"""
import sys
import os
from pathlib import Path
from datetime import datetime, timezone

# ── Ensure the backend/ directory is on sys.path ──
BACKEND_DIR = Path(__file__).resolve().parents[2]  # .../backend
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

import certifi
import pymongo

MONGO_URL = os.getenv("MONGO_URL")
MONGO_DB = os.getenv("MONGO_DB", "edu_platform")

if not MONGO_URL:
    raise RuntimeError("MONGO_URL is not set. Check backend/.env")

# ── Synchronous PyMongo client for migration scripts ──
client = pymongo.MongoClient(
    MONGO_URL,
    tls=True,
    tlsCAFile=certifi.where(),
    serverSelectionTimeoutMS=10_000,
)
db = client[MONGO_DB]

# Force UTF-8 output on Windows
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# ========== Configuration ==========

ADMIN_EMAIL = "admin@eduplatform.com"


# ========== Migration Logic ==========

def get_all_free_pets() -> list[str]:
    """Query all pets with unlock_condition.type='free'"""
    print("\n[MIGRATION] Querying all free pets from database...")
    
    pets_collection = db["pets"]
    free_pets = list(pets_collection.find(
        {"unlock_condition.type": "free"},
        {"pet_id": 1, "name": 1, "rarity": 1, "_id": 0}
    ))
    
    if not free_pets:
        print("  ⚠️  No free pets found in database")
        return []
    
    print(f"  ✅ Found {len(free_pets)} free pet(s):")
    pet_ids = []
    for pet in free_pets:
        print(f"      - {pet['pet_id']:30s} | {pet['name']:20s} | {pet['rarity']}")
        pet_ids.append(pet['pet_id'])
    
    return pet_ids


def get_admin_user():
    """Get admin user document"""
    users_collection = db["users"]
    admin = users_collection.find_one({"email": ADMIN_EMAIL})
    
    if not admin:
        raise RuntimeError(f"Admin user not found: {ADMIN_EMAIL}")
    
    return admin


def add_pets_to_admin(pet_ids: list[str]):
    """Add pets to admin user's unlocked_pets array"""
    if not pet_ids:
        print("\n[MIGRATION] No pets to add (skip)")
        return
    
    print(f"\n[MIGRATION] Adding {len(pet_ids)} free pet(s) to admin user...")
    
    users_collection = db["users"]
    
    # Get current state
    admin = get_admin_user()
    current_unlocked = admin.get("unlocked_pets", [])
    current_active = admin.get("active_pet")
    
    print(f"  Current unlocked pets: {current_unlocked if current_unlocked else '(none)'}")
    print(f"  Current active pet: {current_active if current_active else '(none)'}")
    
    # Use $addToSet to avoid duplicates
    update_ops = {
        "$addToSet": {
            "unlocked_pets": {"$each": pet_ids}
        },
        "$set": {
            "updated_at": datetime.now(timezone.utc)
        }
    }
    
    # Set first free pet as active if no pet is active
    if not current_active and pet_ids:
        update_ops["$set"]["active_pet"] = pet_ids[0]
        print(f"  Setting active_pet to: {pet_ids[0]} (no current active pet)")
    
    result = users_collection.update_one(
        {"email": ADMIN_EMAIL},
        update_ops
    )
    
    if result.modified_count > 0:
        print(f"  ✅ Admin user updated successfully")
    else:
        print(f"  ℹ️  No changes made (pets may already be unlocked)")
    
    # Verify update
    admin = get_admin_user()
    new_unlocked = admin.get("unlocked_pets", [])
    new_active = admin.get("active_pet")
    
    print(f"\n  Final unlocked pets ({len(new_unlocked)}): {new_unlocked}")
    print(f"  Final active pet: {new_active}")
    
    # Summary
    newly_added = set(new_unlocked) - set(current_unlocked)
    if newly_added:
        print(f"\n  ✨ Newly added pets ({len(newly_added)}): {list(newly_added)}")
    else:
        print(f"\n  ℹ️  All free pets were already unlocked")
    
    return result


# ========== Main Execution ==========

if __name__ == "__main__":
    print("=" * 70)
    print("  MIGRATION: Add All Free Pets to Admin Account")
    print("=" * 70)
    print(f"  Database: {MONGO_DB}")
    print(f"  Admin Email: {ADMIN_EMAIL}")
    print("=" * 70)
    
    try:
        # Step 1: Query all free pets
        free_pet_ids = get_all_free_pets()
        
        if not free_pet_ids:
            print("\n⚠️  Migration skipped: No free pets found")
            sys.exit(0)
        
        # Step 2: Add pets to admin user
        add_pets_to_admin(free_pet_ids)
        
        print("\n" + "=" * 70)
        print("  ✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 70)
        print("\n  Next steps:")
        print("    1. Restart backend server if running")
        print("    2. Login as admin@eduplatform.com")
        print("    3. Navigate to /pets page to verify unlocked pets")
        print("    4. Test pet display in flashcard scanning and AR")
        
    except Exception as e:
        print(f"\n❌ Migration failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    finally:
        client.close()
        print("\n[MIGRATION] Database connection closed")
