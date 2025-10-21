import json
from pathlib import Path
from database.mongo_config import db




def load_seed_data(collection_name, file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        db[collection_name].insert_many(data)
        print(f"✅ Seeded {len(data)} items into '{collection_name}'")

if __name__ == "__main__":
    base_path = Path(__file__).parent

    load_seed_data("flashcards", base_path / "flashcards.json")
    load_seed_data("ar_objects", base_path / "ar_objects.json")
    load_seed_data("ai_feedback", base_path / "ai_feedback.json")
    load_seed_data("mini_game_bank", base_path / "mini_game_bank.json")
    load_seed_data("quiz_questions", base_path / "quiz_questions.json")  # <-- NEW

    print("[SEED] All collections seeded successfully!")
