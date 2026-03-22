"""
Script to verify AR objects in MongoDB have correct Supabase URLs
"""
from pymongo import MongoClient
from dotenv import load_dotenv
import os
from pprint import pprint

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL")
MONGO_DB = os.getenv("MONGO_DB", "edu_platform")

print("=" * 80)
print("AR Objects URL Verification")
print("=" * 80)

# Connect to MongoDB
client = MongoClient(MONGO_URL)
db = client[MONGO_DB]
ar_objects_collection = db["ar_objects"]

# Expected URL prefix
EXPECTED_PREFIX = "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/"

print(f"\nConnecting to MongoDB database: {MONGO_DB}")
print(f"Expected URL prefix: {EXPECTED_PREFIX}\n")

# 1. Check the elephant AR object first
print("=" * 80)
print("1. ELEPHANT AR OBJECT (ar_tag: 'elephant_marker_01')")
print("=" * 80)

elephant = ar_objects_collection.find_one({"ar_tag": "elephant_marker_01"})

if elephant:
    print(f"\n[OK] Found elephant AR object")
    print(f"  ID: {elephant.get('_id')}")
    print(f"  Name: {elephant.get('object_name')}")
    print(f"  AR Tag: {elephant.get('ar_tag')}")
    print(f"\nURL Fields:")
    
    model_url = elephant.get("model_3d_url", "")
    image_url = elephant.get("image_2d_url", "")
    nft_url = elephant.get("nft_base_url", "")
    
    print(f"\n  model_3d_url:")
    print(f"    {model_url}")
    if model_url.startswith(EXPECTED_PREFIX):
        print(f"    [OK] Correct format")
    else:
        print(f"    [ERROR] INCORRECT - Expected to start with {EXPECTED_PREFIX}")
    
    print(f"\n  image_2d_url:")
    print(f"    {image_url}")
    if image_url.startswith(EXPECTED_PREFIX):
        print(f"    [OK] Correct format")
    else:
        print(f"    [ERROR] INCORRECT - Expected to start with {EXPECTED_PREFIX}")
    
    print(f"\n  nft_base_url:")
    print(f"    {nft_url}")
    if nft_url.startswith(EXPECTED_PREFIX):
        print(f"    [OK] Correct format")
    else:
        print(f"    [ERROR] INCORRECT - Expected to start with {EXPECTED_PREFIX}")
else:
    print("\n[ERROR] Elephant AR object NOT FOUND")

# 2. Check 2-3 other AR objects
print("\n" + "=" * 80)
print("2. OTHER AR OBJECTS (Sample)")
print("=" * 80)

# Get all AR objects except elephant
other_objects = list(ar_objects_collection.find({"ar_tag": {"$ne": "elephant_marker_01"}}).limit(3))

if other_objects:
    for idx, obj in enumerate(other_objects, 1):
        print(f"\n--- AR Object #{idx} ---")
        print(f"  ID: {obj.get('_id')}")
        print(f"  Name: {obj.get('object_name')}")
        print(f"  AR Tag: {obj.get('ar_tag')}")
        
        model_url = obj.get("model_3d_url", "")
        image_url = obj.get("image_2d_url", "")
        nft_url = obj.get("nft_base_url", "")
        
        # Check model_3d_url
        status_3d = "[OK]" if model_url.startswith(EXPECTED_PREFIX) else "[ERROR]"
        print(f"  {status_3d} model_3d_url: {model_url[:80]}...")
        
        # Check image_2d_url
        status_2d = "[OK]" if image_url.startswith(EXPECTED_PREFIX) else "[ERROR]"
        print(f"  {status_2d} image_2d_url: {image_url[:80]}...")
        
        # Check nft_base_url
        status_nft = "[OK]" if nft_url.startswith(EXPECTED_PREFIX) else "[ERROR]"
        print(f"  {status_nft} nft_base_url: {nft_url[:80]}...")
else:
    print("\n[ERROR] No other AR objects found")

# 3. Summary statistics
print("\n" + "=" * 80)
print("3. SUMMARY STATISTICS")
print("=" * 80)

total_count = ar_objects_collection.count_documents({})
print(f"\nTotal AR objects in database: {total_count}")

# Count objects with correct URL formats
correct_model_url = ar_objects_collection.count_documents({
    "model_3d_url": {"$regex": f"^{EXPECTED_PREFIX}"}
})
correct_image_url = ar_objects_collection.count_documents({
    "image_2d_url": {"$regex": f"^{EXPECTED_PREFIX}"}
})
correct_nft_url = ar_objects_collection.count_documents({
    "nft_base_url": {"$regex": f"^{EXPECTED_PREFIX}"}
})

print(f"\nObjects with correct URL format:")
print(f"  model_3d_url:  {correct_model_url}/{total_count} ({correct_model_url*100//total_count if total_count > 0 else 0}%)")
print(f"  image_2d_url:  {correct_image_url}/{total_count} ({correct_image_url*100//total_count if total_count > 0 else 0}%)")
print(f"  nft_base_url:  {correct_nft_url}/{total_count} ({correct_nft_url*100//total_count if total_count > 0 else 0}%)")

if correct_model_url == total_count and correct_image_url == total_count and correct_nft_url == total_count:
    print("\n[SUCCESS] All AR objects have correct Supabase URLs!")
else:
    print("\n[WARNING] Some AR objects have incorrect URL formats")
    print("\nObjects with incorrect URLs:")
    incorrect_objects = ar_objects_collection.find({
        "$or": [
            {"model_3d_url": {"$not": {"$regex": f"^{EXPECTED_PREFIX}"}}},
            {"image_2d_url": {"$not": {"$regex": f"^{EXPECTED_PREFIX}"}}},
            {"nft_base_url": {"$not": {"$regex": f"^{EXPECTED_PREFIX}"}}}
        ]
    })
    for obj in incorrect_objects:
        print(f"  - {obj.get('object_name')} (ar_tag: {obj.get('ar_tag')})")

print("\n" + "=" * 80)
print("Verification Complete")
print("=" * 80)

# Close connection
client.close()
