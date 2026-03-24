"""
add_epic_pets_to_admin.py — Migration script to add 3 additional epic pets to admin.

Run from the backend/ directory:
    python -m database.migrations.add_epic_pets_to_admin

Purpose:
    Grant admin user access to 3 additional epic pets (Storm, Coral, Gold) 
    for expanded testing of the pet 3D model loading system.

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

# Epic pets to add (all from Kenney Blocky Characters pack)
EPIC_PETS_TO_ADD = [
    "kenney_character_m",  # Storm - Epic, #71717A
    "kenney_character_n",  # Coral - Epic, #FB7185
    "kenney_character_o",  # Gold - Epic, #FBBF24
]


# ========== Migration Logic ==========

def validate_pets_exist() -> bool:
    """Verify all 3 epic pets exist in the database"""
    print("\n[MIGRATION] Validating epic pets exist in database...")
    
    pets_collection = db["pets"]
    missing_pets = []
    
    for pet_id in EPIC_PETS_TO_ADD:
        pet = pets_collection.find_one({"pet_id": pet_id})
        if pet:
            print(f"  ✅ Found pet: {pet_id}")
            print(f"     Name: {pet.get('name')} ({pet.get('name_vi')})")
            print(f"     Rarity: {pet.get('rarity')} | Color: {pet.get('color')}")
        else:
            print(f"  ❌ Missing pet: {pet_id}")
            missing_pets.append(pet_id)
    
    if missing_pets:
        print(f"\n  ⚠️  ERROR: {len(missing_pets)} pet(s) not found: {missing_pets}")
        return False
    
    print(f"  ✅ All {len(EPIC_PETS_TO_ADD)} epic pets validated successfully")
    return True


def get_admin_user():
    """Get admin user document"""
    users_collection = db["users"]
    admin = users_collection.find_one({"email": ADMIN_EMAIL})
    
    if not admin:
        raise RuntimeError(f"Admin user not found: {ADMIN_EMAIL}")
    
    return admin


def add_epic_pets_to_admin():
    """Add epic pets to admin user's unlocked_pets array"""
    print(f"\n[MIGRATION] Adding {len(EPIC_PETS_TO_ADD)} epic pets to admin user...")
    
    users_collection = db["users"]
    
    # Get current state
    admin = get_admin_user()
    current_unlocked = admin.get("unlocked_pets", [])
    current_active = admin.get("active_pet")
    
    print(f"  Current unlocked pets count: {len(current_unlocked)}")
    print(f"  Current unlocked pets: {current_unlocked}")
    print(f"  Current active pet: {current_active}")
    
    # Use $addToSet to avoid duplicates
    result = users_collection.update_one(
        {"email": ADMIN_EMAIL},
        {
            "$addToSet": {
                "unlocked_pets": {"$each": EPIC_PETS_TO_ADD}
            },
            "$set": {
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    if result.modified_count > 0:
        print(f"  ✅ Admin user updated successfully")
    else:
        print(f"  ℹ️  No changes made (epic pets may already be unlocked)")
    
    # Verify update
    admin = get_admin_user()
    new_unlocked = admin.get("unlocked_pets", [])
    new_active = admin.get("active_pet")
    
    print(f"\n  Final unlocked pets count: {len(new_unlocked)}")
    print(f"  Final active pet: {new_active}")
    
    # Summary
    newly_added = set(new_unlocked) - set(current_unlocked)
    if newly_added:
        print(f"\n  ✨ Newly added epic pets: {list(newly_added)}")
        
        # Show details of newly added pets
        print(f"\n  📋 Details of newly added pets:")
        pets_collection = db["pets"]
        for pet_id in newly_added:
            pet = pets_collection.find_one({"pet_id": pet_id})
            if pet:
                print(f"     • {pet.get('name')} ({pet_id})")
                print(f"       - Vietnamese: {pet.get('name_vi')}")
                print(f"       - Rarity: {pet.get('rarity')} | Color: {pet.get('color')}")
    else:
        print(f"\n  ℹ️  All epic pets were already unlocked")
    
    return result


# ========== Main Execution ==========

if __name__ == "__main__":
    print("=" * 70)
    print("  MIGRATION: Add 3 Epic Pets to Admin Account")
    print("=" * 70)
    print(f"  Database: {MONGO_DB}")
    print(f"  Admin Email: {ADMIN_EMAIL}")
    print(f"  Epic Pets to Add:")
    print(f"    - Storm (kenney_character_m)")
    print(f"    - Coral (kenney_character_n)")
    print(f"    - Gold (kenney_character_o)")
    print("=" * 70)
    
    try:
        # Step 1: Validate pets exist
        if not validate_pets_exist():
            print("\n❌ Migration aborted: Some epic pets do not exist in database")
            sys.exit(1)
        
        # Step 2: Add epic pets to admin user
        add_epic_pets_to_admin()
        
        print("\n" + "=" * 70)
        print("  ✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 70)
        print("\n  Admin now has access to:")
        print("    Previous: Beta, Delta, Foxtrot")
        print("    New: Storm, Coral, Gold")
        print("    Total: 6 unlocked pets")
        print("\n  Next steps:")
        print("    1. Restart backend server if running")
        print("    2. Login as admin@eduplatform.com")
        print("    3. Navigate to Pets page to verify all 6 pets appear")
        print("    4. Test 3D model loading for each pet")
        
    except Exception as e:
        print(f"\n❌ Migration failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    finally:
        client.close()
        print("\n[MIGRATION] Database connection closed")
