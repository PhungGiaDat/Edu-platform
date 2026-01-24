"""
Database Seed Script - Add quiz and game data to MongoDB

Run this script to seed the production database:
    python scripts/seed_quiz_game.py

Make sure MONGO_URI environment variable is set to production MongoDB.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime

# Get MongoDB URI from environment or use local
MONGO_URI = os.getenv("MONGO_URL", os.getenv("MONGO_URI", "mongodb://localhost:27017"))
DATABASE_NAME = os.getenv("MONGO_DB", "edu_platform")


async def seed_data():
    """Seed quiz and game data for elephant flashcard"""
    print(f"🔌 Connecting to MongoDB: {MONGO_URI[:30]}...")
    
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DATABASE_NAME]
    
    # ===== QUIZ DATA =====
    quiz_data = {
        "flashcard_qr_id": "ele123",
        "questions": [
            {
                "id": "ele123_q1",
                "type": "multiple_choice",
                "question_text": "Từ vựng 'elephant' trong tiếng Việt nghĩa là gì?",
                "image_url": "/images/question/elephant/question1.jpg",
                "options": ["Con voi", "Con mèo", "Con chó", "Con gà"],
                "correct_answer": "Con voi",
                "explanation": "Elephant trong tiếng Việt là 'Con voi'."
            },
            {
                "id": "ele123_q2",
                "type": "true_false",
                "question_text": "The elephant is the largest land mammal.",
                "options": ["Đúng", "Sai"],
                "correct_answer": "Đúng",
                "explanation": "Đúng, voi là động vật có vú lớn nhất trên cạn.",
                "image_url": "/images/question/elephant/question2.jpg"
            },
            {
                "id": "ele123_q3",
                "type": "multiple_choice",
                "question_text": "How do you spell 'elephant'?",
                "options": ["E-L-E-P-H-A-N-T", "E-L-E-F-A-N-T", "E-L-I-P-H-A-N-T", "E-L-L-E-P-H-A-N-T"],
                "correct_answer": "E-L-E-P-H-A-N-T",
                "explanation": "Elephant được viết là E-L-E-P-H-A-N-T"
            }
        ],
        "time_limit": 120,
        "passing_score": 2,
        "created_at": datetime.utcnow()
    }
    
    # Upsert quiz
    result = await db.quiz_questions.update_one(
        {"flashcard_qr_id": "ele123"},
        {"$set": quiz_data},
        upsert=True
    )
    print(f"✅ Quiz seeded: {result.modified_count or 'inserted'}")
    
    # ===== GAME DATA =====
    games = [
        {
            "game_type": "drag_match",
            "flashcard_qr_id": "ele123",
            "difficulty": "easy",
            "question": "Drag the word to match the picture! 🧩",
            "image_url": "/images/flashcard_elephant.png",
            "correct_answer": "Elephant",
            "choices": ["Elephant", "Tiger", "Lion", "Bear"],
            "hint": "It has a long trunk! 🐘",
            "encouragement_wrong": "Try again! Look at the picture carefully! 👀",
            "celebration_right": "Perfect match! You did it! 🎉",
            "time_limit": None,
            "stars_reward": 1
        },
        {
            "game_type": "drag_match",
            "flashcard_qr_id": "ele123",
            "difficulty": "medium",
            "question": "Kéo từ đúng vào hình! 🧩",
            "image_url": "/images/flashcard_elephant.png",
            "correct_answer": "Con voi",
            "choices": ["Con voi", "Con hổ", "Con sư tử", "Con gấu"],
            "hint": "Động vật có vòi dài! 🐘",
            "encouragement_wrong": "Gần rồi! Thử lại nhé! 💪",
            "celebration_right": "Tuyệt vời! Bạn giỏi quá! ⭐",
            "time_limit": 60,
            "stars_reward": 2
        },
        {
            "game_type": "word_scramble",
            "flashcard_qr_id": "ele123",
            "difficulty": "easy",
            "question": "Unscramble the letters to spell the animal! 🔤",
            "scrambled": "TENEPALH",
            "correct_answer": "ELEPHANT",
            "hint": "Big grey animal with trunk! 🐘",
            "encouragement_wrong": "Almost! Try again! 💪",
            "celebration_right": "Amazing spelling! 🎉",
            "time_limit": 45,
            "stars_reward": 2
        },
        {
            "game_type": "catch_word",
            "flashcard_qr_id": "ele123",
            "difficulty": "medium",
            "question": "Catch all the correct words! 🎯",
            "correct_words": ["elephant", "ELEPHANT", "Elephant"],
            "wrong_words": ["tiger", "lion", "bear", "monkey", "zebra"],
            "time_limit": 30,
            "stars_reward": 3
        }
    ]
    
    for game in games:
        game["created_at"] = datetime.utcnow()
        result = await db.mini_game_bank.update_one(
            {
                "flashcard_qr_id": game["flashcard_qr_id"],
                "game_type": game["game_type"],
                "difficulty": game["difficulty"]
            },
            {"$set": game},
            upsert=True
        )
        print(f"✅ Game seeded: {game['game_type']} ({game['difficulty']})")
    
    print("\n🎉 Database seeding complete!")
    await client.close()


if __name__ == "__main__":
    asyncio.run(seed_data())
