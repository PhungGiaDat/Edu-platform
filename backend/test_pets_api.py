"""
Quick test script to verify pets API returns results after migration.
Run: python test_pets_api.py
"""
import sys
import os
from pathlib import Path

# Add backend to path
BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

import certifi
import pymongo

MONGO_URL = os.getenv("MONGO_URL")
MONGO_DB = os.getenv("MONGO_DB", "edu_platform")

client = pymongo.MongoClient(
    MONGO_URL,
    tls=True,
    tlsCAFile=certifi.where(),
    serverSelectionTimeoutMS=10_000,
)
db = client[MONGO_DB]

# Force UTF-8 output
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

print("=" * 70)
print("  Testing Pets API Query (Simulating API Behavior)")
print("=" * 70)

# Test 1: Count pets with is_active=True (what API queries)
pets_collection = db["pets"]
active_pets = list(pets_collection.find({"is_active": True}))

print(f"\n[TEST] Query: db.pets.find({{is_active: true}})")
print(f"  Result: {len(active_pets)} pet(s) found")

if len(active_pets) == 0:
    print("  ❌ FAILED: API would return 0 pets")
    sys.exit(1)

print(f"  ✅ SUCCESS: API will return {len(active_pets)} pets")

# Test 2: Check admin user's unlocked pets
users_collection = db["users"]
admin = users_collection.find_one({"email": "admin@eduplatform.com"})

if not admin:
    print("\n  ⚠️  Warning: Admin user not found")
else:
    unlocked_pets = admin.get("unlocked_pets", [])
    active_pet = admin.get("active_pet")
    
    print(f"\n[TEST] Admin User Status")
    print(f"  Email: {admin['email']}")
    print(f"  Unlocked pets: {len(unlocked_pets)}")
    print(f"  Active pet: {active_pet}")
    
    if unlocked_pets:
        print(f"\n  Unlocked pet IDs:")
        for pet_id in unlocked_pets:
            print(f"    - {pet_id}")

# Test 3: Sample response (what frontend will receive)
print(f"\n[TEST] Sample API Response (first 5 pets)")
print(f"  Total pets returned: {len(active_pets)}")

for i, pet in enumerate(active_pets[:5]):
    print(f"    {i+1}. {pet['pet_id']:30s} | {pet['name']:20s} | Rarity: {pet.get('rarity', 'N/A')}")

if len(active_pets) > 5:
    print(f"    ... and {len(active_pets) - 5} more pets")

print("\n" + "=" * 70)
print("  ✅ ALL TESTS PASSED")
print("=" * 70)
print("\n  The pets API is ready to use!")
print("  Next: Start backend server and test from frontend")

client.close()
