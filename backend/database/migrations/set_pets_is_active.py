"""
set_pets_is_active.py — Migration script to add is_active field to all pets.

Run from the backend/ directory:
    python -m database.migrations.set_pets_is_active

Purpose:
    Add is_active=True to all pet documents in the database.
    This fixes the issue where GET /api/v1/pets returns 0 results
    because the query filters by is_active=True, but no pets have this field.

Root Cause:
    - API query (backend/api/pets.py:103): pets = await PetDocument.find({"is_active": True}).to_list()
    - Database check revealed all 28 pets are missing the is_active field
    - This causes the API to return an empty array []

Safety:
    - Idempotent: Safe to run multiple times (uses $set)
    - Updates ALL pets in the database
    - Sets is_active=True for all pets (default behavior)
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


# ========== Migration Logic ==========

def check_current_state():
    """Check current state of pets before migration"""
    print("\n[MIGRATION] Checking current state of pets...")
    
    pets_collection = db["pets"]
    
    # Count total pets
    total_pets = pets_collection.count_documents({})
    
    # Count pets with is_active field
    has_field = pets_collection.count_documents({"is_active": {"$exists": True}})
    missing_field = total_pets - has_field
    
    # Count pets with is_active=True
    active_true = pets_collection.count_documents({"is_active": True})
    
    # Count pets with is_active=False
    active_false = pets_collection.count_documents({"is_active": False})
    
    print(f"  Total pets in database: {total_pets}")
    print(f"  Pets with is_active field: {has_field}")
    print(f"  Pets missing is_active field: {missing_field}")
    print(f"  Pets with is_active=True: {active_true}")
    print(f"  Pets with is_active=False: {active_false}")
    
    if missing_field == 0:
        print("\n  ✅ All pets already have is_active field")
        return False
    
    print(f"\n  ⚠️  {missing_field} pet(s) need is_active field added")
    return True


def set_is_active_for_all_pets():
    """Add is_active=True to all pets"""
    print("\n[MIGRATION] Setting is_active=True for all pets...")
    
    pets_collection = db["pets"]
    
    # Update all pets to have is_active=True
    result = pets_collection.update_many(
        {},  # Match all pets
        {
            "$set": {
                "is_active": True,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    print(f"  ✅ Matched {result.matched_count} pet(s)")
    print(f"  ✅ Modified {result.modified_count} pet(s)")
    
    return result


def verify_migration():
    """Verify migration completed successfully"""
    print("\n[MIGRATION] Verifying migration results...")
    
    pets_collection = db["pets"]
    
    # Count total pets
    total_pets = pets_collection.count_documents({})
    
    # Count pets with is_active=True
    active_true = pets_collection.count_documents({"is_active": True})
    
    # Count pets missing is_active field
    missing_field = pets_collection.count_documents({"is_active": {"$exists": False}})
    
    print(f"  Total pets: {total_pets}")
    print(f"  Pets with is_active=True: {active_true}")
    print(f"  Pets missing is_active field: {missing_field}")
    
    if missing_field > 0:
        print(f"\n  ❌ Migration incomplete: {missing_field} pet(s) still missing is_active field")
        return False
    
    if active_true != total_pets:
        print(f"\n  ⚠️  Warning: {total_pets - active_true} pet(s) have is_active=False")
        print("      This is unusual but may be intentional")
    
    print(f"\n  ✅ All {total_pets} pet(s) now have is_active field")
    return True


def show_sample_pets():
    """Show sample pets to verify field was added"""
    print("\n[MIGRATION] Sample pets (first 5):")
    
    pets_collection = db["pets"]
    
    sample_pets = list(pets_collection.find(
        {},
        {"pet_id": 1, "name": 1, "is_active": 1, "_id": 0}
    ).limit(5))
    
    for pet in sample_pets:
        is_active = pet.get("is_active", "MISSING")
        print(f"  - {pet['pet_id']:30s} | {pet['name']:20s} | is_active={is_active}")


# ========== Main Execution ==========

if __name__ == "__main__":
    print("=" * 70)
    print("  MIGRATION: Set is_active=True for All Pets")
    print("=" * 70)
    print(f"  Database: {MONGO_DB}")
    print(f"  Collection: pets")
    print("=" * 70)
    
    try:
        # Step 1: Check current state
        needs_migration = check_current_state()
        
        if not needs_migration:
            print("\n" + "=" * 70)
            print("  ℹ️  MIGRATION SKIPPED (Already up to date)")
            print("=" * 70)
            sys.exit(0)
        
        # Step 2: Set is_active=True for all pets
        result = set_is_active_for_all_pets()
        
        # Step 3: Verify migration
        success = verify_migration()
        
        # Step 4: Show sample pets
        show_sample_pets()
        
        if not success:
            print("\n" + "=" * 70)
            print("  ❌ MIGRATION FAILED")
            print("=" * 70)
            sys.exit(1)
        
        print("\n" + "=" * 70)
        print("  ✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 70)
        print("\n  Next steps:")
        print("    1. Restart backend server if running")
        print("    2. Login as admin@eduplatform.com")
        print("    3. Test GET /api/v1/pets endpoint (should return all 28 pets)")
        print("    4. Navigate to /pets page to verify pets are displayed")
        print("\n  Expected API response:")
        print("    - Should return 28 total pets (all with is_active=True)")
        print("    - Admin should see 8 unlocked pets in 'My Character' tab")
        
    except Exception as e:
        print(f"\n❌ Migration failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    finally:
        client.close()
        print("\n[MIGRATION] Database connection closed")
