# backend/database/migrations/create_optimized_indexes.py
"""
MongoDB Index Optimization Migration Script

Run this script to create all optimized indexes for the Edu-platform.
Usage: python -m backend.database.migrations.create_optimized_indexes

This migration is safe to run multiple times - indexes will only be created if they don't exist.
"""
import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from settings import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# TTL constants (in seconds)
TTL_90_DAYS = 7776000  # 90 days
TTL_180_DAYS = 15552000  # 180 days
TTL_365_DAYS = 31536000  # 365 days


async def create_indexes():
    """Create all optimized indexes for the Edu-platform MongoDB database."""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.MONGO_DB]
    
    logger.info("=" * 60)
    logger.info("MongoDB Index Optimization Migration")
    logger.info("=" * 60)
    
    try:
        # ========== pronunciation_attempts ==========
        logger.info("\n📦 Creating indexes for: pronunciation_attempts")
        
        collection = db.pronunciation_attempts
        
        # Unique index on attempt_id
        await collection.create_index(
            [("attempt_id", 1)],
            unique=True,
            background=True,
            name="attempt_id_unique"
        )
        logger.info("  ✅ attempt_id (unique)")
        
        # Compound index for user pronunciation history
        await collection.create_index(
            [("user_id", 1), ("flashcard_qr_id", 1)],
            background=True,
            name="user_flashcard_compound"
        )
        logger.info("  ✅ user_id + flashcard_qr_id (compound)")
        
        # Index for user's recent attempts
        await collection.create_index(
            [("user_id", 1), ("attempted_at", -1)],
            background=True,
            name="user_attempts_recent"
        )
        logger.info("  ✅ user_id + attempted_at (descending)")
        
        # Index for course/lesson context
        await collection.create_index(
            [("course_id", 1), ("lesson_id", 1)],
            background=True,
            sparse=True,
            name="course_lesson_context"
        )
        logger.info("  ✅ course_id + lesson_id (sparse)")
        
        # Partial index for processing status
        await collection.create_index(
            [("status", 1)],
            partialFilterExpression={"status": "processing"},
            background=True,
            name="processing_status_partial"
        )
        logger.info("  ✅ status partial (processing only)")
        
        # TTL index - auto-delete after 90 days
        await collection.create_index(
            [("attempted_at", 1)],
            expireAfterSeconds=TTL_90_DAYS,
            background=True,
            name="ttl_90_days"
        )
        logger.info("  ✅ attempted_at TTL (90 days)")
        
        # ========== session_logs ==========
        logger.info("\n📦 Creating indexes for: session_logs")
        
        collection = db.session_logs
        
        # Compound index for user's session history
        await collection.create_index(
            [("user_id", 1), ("started_at", -1)],
            background=True,
            name="user_sessions_recent"
        )
        logger.info("  ✅ user_id + started_at (descending)")
        
        # Index for topic-based analytics
        await collection.create_index(
            [("active_topic", 1), ("started_at", -1)],
            background=True,
            sparse=True,
            name="topic_sessions"
        )
        logger.info("  ✅ active_topic + started_at (sparse)")
        
        # TTL index - auto-delete after 365 days
        await collection.create_index(
            [("started_at", 1)],
            expireAfterSeconds=TTL_365_DAYS,
            background=True,
            name="ttl_365_days"
        )
        logger.info("  ✅ started_at TTL (365 days)")
        
        # ========== user_sessions (NEW) ==========
        logger.info("\n📦 Creating indexes for: user_sessions")
        
        collection = db.user_sessions
        
        # Unique index on session_id
        await collection.create_index(
            [("session_id", 1)],
            unique=True,
            background=True,
            name="session_id_unique"
        )
        logger.info("  ✅ session_id (unique)")
        
        # Compound index for active sessions by user
        await collection.create_index(
            [("user_id", 1), ("status", 1)],
            background=True,
            name="user_active_sessions"
        )
        logger.info("  ✅ user_id + status (compound)")
        
        # Index for user's session history
        await collection.create_index(
            [("user_id", 1), ("started_at", -1)],
            background=True,
            name="user_session_history"
        )
        logger.info("  ✅ user_id + started_at (descending)")
        
        # Index for status-based queries
        await collection.create_index(
            [("status", 1), ("started_at", -1)],
            background=True,
            name="status_sessions"
        )
        logger.info("  ✅ status + started_at (compound)")
        
        # Index for course-based analytics
        await collection.create_index(
            [("course_id", 1), ("started_at", -1)],
            background=True,
            sparse=True,
            name="course_sessions"
        )
        logger.info("  ✅ course_id + started_at (sparse)")
        
        # Index for lesson-based analytics
        await collection.create_index(
            [("lesson_id", 1), ("started_at", -1)],
            background=True,
            sparse=True,
            name="lesson_sessions"
        )
        logger.info("  ✅ lesson_id + started_at (sparse)")
        
        # ========== course_lessons (NEW) ==========
        logger.info("\n📦 Creating indexes for: course_lessons")
        
        collection = db.course_lessons
        
        # Unique index on lesson_id
        await collection.create_index(
            [("lesson_id", 1)],
            unique=True,
            background=True,
            name="lesson_id_unique"
        )
        logger.info("  ✅ lesson_id (unique)")
        
        # Compound index for ordered lessons in course
        await collection.create_index(
            [("course_id", 1), ("order", 1)],
            background=True,
            name="course_lessons_order"
        )
        logger.info("  ✅ course_id + order (compound)")
        
        # Index for status/lesson_type queries
        await collection.create_index(
            [("status", 1), ("lesson_type", 1)],
            background=True,
            name="status_lesson_type"
        )
        logger.info("  ✅ status + lesson_type (compound)")
        
        # Index for creator's content
        await collection.create_index(
            [("created_by", 1), ("status", 1)],
            background=True,
            name="creator_content"
        )
        logger.info("  ✅ created_by + status (compound)")
        
        # Text index for title search
        await collection.create_index(
            [("$**", "text")],
            background=True,
            name="title_text_search"
        )
        logger.info("  ✅ $** text search (full-text)")
        
        # ========== flashcards ==========
        logger.info("\n📦 Creating indexes for: flashcards")
        
        collection = db.flashcards
        
        # Unique index on qr_id
        await collection.create_index(
            [("qr_id", 1)],
            unique=True,
            background=True,
            name="qr_id_unique"
        )
        logger.info("  ✅ qr_id (unique)")
        
        # Compound index for category/difficulty queries
        await collection.create_index(
            [("category", 1), ("difficulty", 1)],
            background=True,
            name="category_difficulty"
        )
        logger.info("  ✅ category + difficulty (compound)")
        
        # ========== learning_progress ==========
        logger.info("\n📦 Creating indexes for: learning_progress")
        
        collection = db.learning_progress
        
        # Unique compound index
        await collection.create_index(
            [("user_id", 1), ("flashcard_qr_id", 1)],
            unique=True,
            background=True,
            name="user_flashcard_unique"
        )
        logger.info("  ✅ user_id + flashcard_qr_id (unique)")
        
        # Index for mastery leaderboard
        await collection.create_index(
            [("user_id", 1), ("mastery_level", -1)],
            background=True,
            name="user_mastery"
        )
        logger.info("  ✅ user_id + mastery_level (descending)")
        
        # Partial index for mastered items
        await collection.create_index(
            [("mastery_level", -1)],
            partialFilterExpression={"mastery_level": {"$gte": 3}},
            background=True,
            name="mastered_items_partial"
        )
        logger.info("  ✅ mastery_level partial (>= 3)")
        
        # ========== quiz_attempts ==========
        logger.info("\n📦 Creating indexes for: quiz_attempts")
        
        collection = db.quiz_attempts
        
        # Compound index for user's quiz history
        await collection.create_index(
            [("user_id", 1), ("attempted_at", -1)],
            background=True,
            name="user_quiz_history"
        )
        logger.info("  ✅ user_id + attempted_at (descending)")
        
        # Index for quiz type queries
        await collection.create_index(
            [("user_id", 1), ("quiz_type", 1)],
            background=True,
            name="user_quiz_type"
        )
        logger.info("  ✅ user_id + quiz_type (compound)")
        
        # ========== redis_cache (NEW) ==========
        logger.info("\n📦 Creating indexes for: redis_cache")
        
        collection = db.redis_cache
        
        # Unique index on cache_key
        await collection.create_index(
            [("cache_key", 1)],
            unique=True,
            background=True,
            name="cache_key_unique"
        )
        logger.info("  ✅ cache_key (unique)")
        
        # Index for cache type queries
        await collection.create_index(
            [("cache_type", 1), ("expires_at", 1)],
            background=True,
            name="cache_type_expiry"
        )
        logger.info("  ✅ cache_type + expires_at (compound)")
        
        # TTL index for auto-expiration
        await collection.create_index(
            [("expires_at", 1)],
            expireAfterSeconds=0,
            background=True,
            name="cache_ttl"
        )
        logger.info("  ✅ expires_at TTL (auto)")
        
        # Index for cache warming queries
        await collection.create_index(
            [("cache_type", 1), ("created_at", 1)],
            background=True,
            name="cache_warming"
        )
        logger.info("  ✅ cache_type + created_at (compound)")
        
        logger.info("\n" + "=" * 60)
        logger.info("✅ All optimized indexes created successfully!")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"❌ Error creating indexes: {e}")
        raise
    finally:
        client.close()


async def verify_indexes():
    """Verify that all indexes were created successfully."""
    
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.MONGO_DB]
    
    logger.info("\n📊 Verifying indexes...")
    
    collections = [
        "pronunciation_attempts",
        "session_logs",
        "user_sessions",
        "course_lessons",
        "flashcards",
        "learning_progress",
        "quiz_attempts",
        "redis_cache",
    ]
    
    for coll_name in collections:
        collection = db[coll_name]
        indexes = await collection.index_information()
        logger.info(f"  {coll_name}: {len(indexes)} indexes")
        for idx_name, idx_info in indexes.items():
            logger.info(f"    - {idx_name}: {idx_info.get('key', {})}")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(create_indexes())
    asyncio.run(verify_indexes())
