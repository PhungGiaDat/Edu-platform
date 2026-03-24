"""
add_pets_to_admin.py — Migration script to add 3 test pets to admin account.

Run from the backend/ directory:
    python -m database.migrations.add_pets_to_admin

Purpose:
    Grant admin user access to 3 pets (Beta, Delta, Foxtrot) for testing 
    the pet 3D model loading system.

Safety:
    - Idempotent: Safe to run multiple times (uses $addToSet)
    - Validates pet existence before adding
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

# Pet IDs to add (stored as strings in unlocked_pets array)
PETS_TO_ADD = [
    "blocky_beta",      # Common rarity
    "blocky_delta",     # Rare rarity
    "blocky_foxtrot",   # Epic rarity
]

DEFAULT_ACTIVE_PET = "blocky_beta"  # Set as active for immediate testing


# ========== Migration Logic ==========

def validate_pets_exist() -> bool:
    """Verify all 3 pets exist in the database"""
    print("\n[MIGRATION] Validating pets exist in database...")
    
    pets_collection = db["pets"]
    missing_pets = []
    
    for pet_id in PETS_TO_ADD:
        pet = pets_collection.find_one({"pet_id": pet_id})
        if pet:
            print(f"  ✅ Found pet: {pet_id} (name: {pet.get('name')}, rarity: {pet.get('rarity')})")
        else:
            print(f"  ❌ Missing pet: {pet_id}")
            missing_pets.append(pet_id)
    
    if missing_pets:
        print(f"\n  ⚠️  ERROR: {len(missing_pets)} pet(s) not found: {missing_pets}")
        return False
    
    print(f"  ✅ All {len(PETS_TO_ADD)} pets validated successfully")
    return True


def get_admin_user():
    """Get admin user document"""
    users_collection = db["users"]
    admin = users_collection.find_one({"email": ADMIN_EMAIL})
    
    if not admin:
        raise RuntimeError(f"Admin user not found: {ADMIN_EMAIL}")
    
    return admin


def add_pets_to_admin():
    """Add pets to admin user's unlocked_pets array"""
    print(f"\n[MIGRATION] Adding {len(PETS_TO_ADD)} pets to admin user...")
    
    users_collection = db["users"]
    
    # Get current state
    admin = get_admin_user()
    current_unlocked = admin.get("unlocked_pets", [])
    current_active = admin.get("active_pet")
    
    print(f"  Current unlocked pets: {current_unlocked}")
    print(f"  Current active pet: {current_active}")
    
    # Use $addToSet to avoid duplicates
    result = users_collection.update_one(
        {"email": ADMIN_EMAIL},
        {
            "$addToSet": {
                "unlocked_pets": {"$each": PETS_TO_ADD}
            },
            "$set": {
                "active_pet": DEFAULT_ACTIVE_PET,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    if result.modified_count > 0:
        print(f"  ✅ Admin user updated successfully")
    else:
        print(f"  ℹ️  No changes made (pets may already be unlocked)")
    
    # Verify update
    admin = get_admin_user()
    new_unlocked = admin.get("unlocked_pets", [])
    new_active = admin.get("active_pet")
    
    print(f"\n  Final unlocked pets: {new_unlocked}")
    print(f"  Final active pet: {new_active}")
    
    # Summary
    newly_added = set(new_unlocked) - set(current_unlocked)
    if newly_added:
        print(f"\n  ✨ Newly added pets: {list(newly_added)}")
    
    return result


# ========== Main Execution ==========

if __name__ == "__main__":
    print("=" * 70)
    print("  MIGRATION: Add 3 Test Pets to Admin Account")
    print("=" * 70)
    print(f"  Database: {MONGO_DB}")
    print(f"  Admin Email: {ADMIN_EMAIL}")
    print(f"  Pets to Add: {PETS_TO_ADD}")
    print("=" * 70)
    
    try:
        # Step 1: Validate pets exist
        if not validate_pets_exist():
            print("\n❌ Migration aborted: Some pets do not exist in database")
            sys.exit(1)
        
        # Step 2: Add pets to admin user
        add_pets_to_admin()
        
        print("\n" + "=" * 70)
        print("  ✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 70)
        print("\n  Next steps:")
        print("    1. Restart backend server if running")
        print("    2. Login as admin@eduplatform.com")
        print("    3. Navigate to Pets page to verify 3D models load")
        print("    4. Test pet AR display in flashcard scanning")
        
    except Exception as e:
        print(f"\n❌ Migration failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    finally:
        client.close()
        print("\n[MIGRATION] Database connection closed")
