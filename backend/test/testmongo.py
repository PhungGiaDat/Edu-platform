from database.mongo_config import flashcards_col

result = flashcards_col.find_one({"qr_id": "ele123"})
print(result)
