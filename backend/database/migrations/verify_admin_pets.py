"""
verify_admin_pets.py — Quick verification script to check admin's unlocked pets.

Run from the backend/ directory:
    python -m database.migrations.verify_admin_pets
"""
import sys
import os
from pathlib import Path

# ── Ensure the backend/ directory is on sys.path ──
BACKEND_DIR = Path(__file__).resolve().parents[2]  # .../backend
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

import certifi
import pymongo
import json

MONGO_URL = os.getenv("MONGO_URL")
MONGO_DB = os.getenv("MONGO_DB", "edu_platform")

if not MONGO_URL:
    raise RuntimeError("MONGO_URL is not set. Check backend/.env")

# ── Synchronous PyMongo client ──
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

if __name__ == "__main__":
    print("=" * 70)
    print("  VERIFICATION: Admin User Pets Status")
    print("=" * 70)
    
    # Get admin user
    admin = db["users"].find_one({"email": "admin@eduplatform.com"})
    
    if not admin:
        print("❌ Admin user not found!")
        sys.exit(1)
    
    print(f"\n📧 Email: {admin.get('email')}")
    print(f"👤 Username: {admin.get('username')}")
    print(f"🏷️  Full Name: {admin.get('full_name')}")
    
    unlocked_pets = admin.get("unlocked_pets", [])
    active_pet = admin.get("active_pet")
    
    print(f"\n🔓 Unlocked Pets Count: {len(unlocked_pets)}")
    print(f"🌟 Active Pet: {active_pet}")
    
    if unlocked_pets:
        print("\n📋 Unlocked Pet Details:")
        for pet_id in unlocked_pets:
            pet = db["pets"].find_one({"pet_id": pet_id})
            if pet:
                print(f"  • {pet.get('name')} ({pet_id})")
                print(f"    - Rarity: {pet.get('rarity')}")
                print(f"    - Color: {pet.get('color')}")
                print(f"    - Model: {pet.get('model_url')[:60]}...")
            else:
                print(f"  ⚠️  Pet not found: {pet_id}")
    else:
        print("\n⚠️  No unlocked pets")
    
    print("\n" + "=" * 70)
    print("  ✅ VERIFICATION COMPLETE")
    print("=" * 70)
    
    client.close()
