"""
Seed the generated kids course learning sample.

Run from backend/:
    python seed_generated_course.py
"""

import asyncio
import sys
from datetime import datetime

import certifi
import motor.motor_asyncio
from dotenv import load_dotenv

from services.course_service import load_all_course_seeds, load_course_seed
from settings import settings


load_dotenv()


async def main() -> None:
    client = motor.motor_asyncio.AsyncIOMotorClient(
        settings.MONGO_URL,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=10_000,
    )
    db = client[settings.MONGO_DB]
    seed_name = sys.argv[1] if len(sys.argv) > 1 else None
    courses = load_all_course_seeds() if seed_name in (None, "all") else [load_course_seed(seed_name)]
    for course in courses:
        course = dict(course)
        created_at = course.pop("created_at", datetime.utcnow())
        course["updated_at"] = datetime.utcnow()
        result = await db.courses.update_one(
            {"course_id": course["course_id"]},
            {
                "$set": course,
                "$setOnInsert": {"created_at": created_at},
            },
            upsert=True,
        )
        action = "inserted" if result.upserted_id else "updated"
        print(f"{action}: {course['course_id']}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
