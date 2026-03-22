"""
Detailed verification script to show exact URLs of problematic AR objects
"""
from pymongo import MongoClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL")
MONGO_DB = os.getenv("MONGO_DB", "edu_platform")

# Connect to MongoDB
client = MongoClient(MONGO_URL)
db = client[MONGO_DB]
ar_objects_collection = db["ar_objects"]

# Expected URL prefix
EXPECTED_PREFIX = "https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/"

print("=" * 80)
print("DETAILED AR OBJECTS WITH INCORRECT URLS")
print("=" * 80)

# Find objects with incorrect URLs
incorrect_objects = ar_objects_collection.find({
    "$or": [
        {"model_3d_url": {"$not": {"$regex": f"^{EXPECTED_PREFIX}"}}},
        {"image_2d_url": {"$not": {"$regex": f"^{EXPECTED_PREFIX}"}}},
        {"nft_base_url": {"$not": {"$regex": f"^{EXPECTED_PREFIX}"}}}
    ]
})

count = 0
for obj in incorrect_objects:
    count += 1
    print(f"\n{count}. AR Tag: {obj.get('ar_tag')}")
    print(f"   Object ID: {obj.get('_id')}")
    
    model_url = obj.get("model_3d_url", "")
    image_url = obj.get("image_2d_url", "")
    nft_url = obj.get("nft_base_url", "")
    
    # Check each URL
    print(f"\n   model_3d_url:")
    if model_url.startswith(EXPECTED_PREFIX):
        print(f"     [OK] {model_url}")
    else:
        print(f"     [WRONG] {model_url}")
    
    print(f"\n   image_2d_url:")
    if image_url.startswith(EXPECTED_PREFIX):
        print(f"     [OK] {image_url}")
    else:
        print(f"     [WRONG] {image_url}")
    
    print(f"\n   nft_base_url:")
    if nft_url.startswith(EXPECTED_PREFIX):
        print(f"     [OK] {nft_url}")
    else:
        print(f"     [WRONG] {nft_url}")
    
    print(f"\n   " + "-" * 76)

print(f"\n\nTotal objects with incorrect URLs: {count}")

# Also show the elephant object for comparison (should be correct)
print("\n" + "=" * 80)
print("ELEPHANT OBJECT (for reference - should be correct)")
print("=" * 80)

elephant = ar_objects_collection.find_one({"ar_tag": "elephant_marker_01"})
if elephant:
    print(f"\nAR Tag: {elephant.get('ar_tag')}")
    print(f"Object ID: {elephant.get('_id')}")
    print(f"\nmodel_3d_url:")
    print(f"  {elephant.get('model_3d_url')}")
    print(f"\nimage_2d_url:")
    print(f"  {elephant.get('image_2d_url')}")
    print(f"\nnft_base_url:")
    print(f"  {elephant.get('nft_base_url')}")

# Close connection
client.close()
