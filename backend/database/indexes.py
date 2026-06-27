# backend/database/indexes.py
"""
MongoDB Index Management Module

Comprehensive index management with TTL support for data retention policies.
This module provides:
- Index creation utilities
- TTL index management
- Index verification and analysis
- Migration helpers

Usage:
    from database.indexes import run_index_migration, verify_all_indexes

    # Run all index migrations
    await run_index_migration()

    # Verify indexes
    await verify_all_indexes()
"""
import asyncio
import logging
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


# ============================================================================
# TTL Constants (in seconds)
# ============================================================================

class TTLConfig(str, Enum):
    """TTL configuration for different data types"""
    # Session data - 30 days
    SESSION_LOGS = "session_logs"
    SESSION_DATA = "session_data"

    # Pronunciation/learning data - 90 days
    PRONUNCIATION_ATTEMPTS = "pronunciation_attempts"
    QUIZ_ATTEMPTS = "quiz_attempts"
    LEARNING_ACTIVITY = "learning_activity"

    # Cache data - 7 days
    TTS_CACHE = "tts_cache"
    TRANSLATION_CACHE = "translation_cache"
    MEDIA_CACHE = "media_cache"
    REDIS_CACHE = "redis_cache"

    # Long-term data - 365 days
    USAGE_SESSIONS = "usage_sessions"
    GAME_SESSIONS = "game_sessions"


@dataclass
class TTLPolicy:
    """TTL policy configuration"""
    name: str
    collection: str
    ttl_field: str
    days: int
    description: str = ""

    @property
    def seconds(self) -> int:
        return self.days * 24 * 60 * 60

    @property
    def expire_after_seconds(self) -> int:
        return self.seconds


# TTL Policies Registry
TTL_POLICIES: Dict[str, TTLPolicy] = {
    # 30-day retention
    "session_logs": TTLPolicy(
        name="session_logs",
        collection="session_logs",
        ttl_field="started_at",
        days=30,
        description="Learning session logs - 30 days retention"
    ),
    "session_data": TTLPolicy(
        name="session_data",
        collection="user_sessions",
        ttl_field="created_at",
        days=30,
        description="User session data - 30 days retention"
    ),

    # 90-day retention
    "pronunciation_attempts": TTLPolicy(
        name="pronunciation_attempts",
        collection="pronunciation_attempts",
        ttl_field="attempted_at",
        days=90,
        description="Pronunciation attempts - 90 days retention"
    ),
    "quiz_attempts": TTLPolicy(
        name="quiz_attempts",
        collection="quiz_attempts",
        ttl_field="attempted_at",
        days=90,
        description="Quiz attempts - 90 days retention"
    ),
    "learning_activity": TTLPolicy(
        name="learning_activity",
        collection="chat_logs",
        ttl_field="created_at",
        days=90,
        description="Chat/learning activity - 90 days retention"
    ),

    # 7-day retention
    "tts_cache": TTLPolicy(
        name="tts_cache",
        collection="redis_cache",
        ttl_field="created_at",
        days=7,
        description="TTS cache - 7 days retention"
    ),
    "translation_cache": TTLPolicy(
        name="translation_cache",
        collection="redis_cache",
        ttl_field="created_at",
        days=7,
        description="Translation cache - 7 days retention"
    ),
    "media_cache": TTLPolicy(
        name="media_cache",
        collection="redis_cache",
        ttl_field="created_at",
        days=7,
        description="Media URL cache - 7 days retention"
    ),
    "redis_cache": TTLPolicy(
        name="redis_cache",
        collection="redis_cache",
        ttl_field="created_at",
        days=7,
        description="General cache - 7 days retention"
    ),

    # 365-day retention
    "usage_sessions": TTLPolicy(
        name="usage_sessions",
        collection="usage_sessions",
        ttl_field="started_at",
        days=365,
        description="Usage sessions - 365 days retention"
    ),
    "game_sessions": TTLPolicy(
        name="game_sessions",
        collection="game_sessions",
        ttl_field="started_at",
        days=365,
        description="Game sessions - 365 days retention"
    ),
}


@dataclass
class IndexDefinition:
    """Index definition with metadata"""
    name: str
    collection: str
    fields: List[Tuple[str, int]]  # List of (field_name, direction)
    unique: bool = False
    sparse: bool = False
    partial_filter: Optional[Dict[str, Any]] = None
    ttl_seconds: Optional[int] = None
    background: bool = True
    description: str = ""


# ============================================================================
# Index Registry
# ============================================================================

def get_index_definitions() -> List[IndexDefinition]:
    """
    Get all index definitions for the Edu-platform MongoDB collections.
    
    Returns:
        List of IndexDefinition objects defining all indexes to create
    """

    # TTL constants
    TTL_7_DAYS = 7 * 24 * 60 * 60
    TTL_30_DAYS = 30 * 24 * 60 * 60
    TTL_90_DAYS = 90 * 24 * 60 * 60
    TTL_365_DAYS = 365 * 24 * 60 * 60

    indexes: List[IndexDefinition] = []

    # ------------------------------------------------------------------
    # pronunciation_attempts
    # ------------------------------------------------------------------
    indexes.extend([
        IndexDefinition(
            name="attempt_id_unique",
            collection="pronunciation_attempts",
            fields=[("attempt_id", 1)],
            unique=True,
            description="Unique identifier for each attempt"
        ),
        IndexDefinition(
            name="user_id_idx",
            collection="pronunciation_attempts",
            fields=[("user_id", 1)],
            description="User lookup for pronunciation history"
        ),
        IndexDefinition(
            name="flashcard_qr_id_idx",
            collection="pronunciation_attempts",
            fields=[("flashcard_qr_id", 1)],
            description="Flashcard lookup for word pronunciation history"
        ),
        IndexDefinition(
            name="user_flashcard_compound",
            collection="pronunciation_attempts",
            fields=[("user_id", 1), ("flashcard_qr_id", 1)],
            description="User + flashcard compound for history lookup"
        ),
        IndexDefinition(
            name="user_attempts_recent",
            collection="pronunciation_attempts",
            fields=[("user_id", 1), ("attempted_at", -1)],
            description="User's recent attempts sorted by time"
        ),
        IndexDefinition(
            name="course_lesson_context",
            collection="pronunciation_attempts",
            fields=[("course_id", 1), ("lesson_id", 1)],
            sparse=True,
            description="Course/lesson context for analytics"
        ),
        IndexDefinition(
            name="status_idx",
            collection="pronunciation_attempts",
            fields=[("status", 1)],
            description="Status lookup for processing queue"
        ),
        IndexDefinition(
            name="processing_status_partial",
            collection="pronunciation_attempts",
            fields=[("status", 1)],
            partial_filter={"status": "processing"},
            description="Partial index for active processing items"
        ),
        IndexDefinition(
            name="pronunciation_attempts_ttl",
            collection="pronunciation_attempts",
            fields=[("attempted_at", 1)],
            ttl_seconds=TTL_90_DAYS,
            description="TTL index - auto-delete after 90 days"
        ),
    ])

    # ------------------------------------------------------------------
    # session_logs
    # ------------------------------------------------------------------
    indexes.extend([
        IndexDefinition(
            name="user_id_idx",
            collection="session_logs",
            fields=[("user_id", 1)],
            description="User lookup for session history"
        ),
        IndexDefinition(
            name="user_sessions_recent",
            collection="session_logs",
            fields=[("user_id", 1), ("started_at", -1)],
            description="User's sessions sorted by most recent"
        ),
        IndexDefinition(
            name="topic_sessions",
            collection="session_logs",
            fields=[("active_topic", 1), ("started_at", -1)],
            sparse=True,
            description="Topic-based session analytics"
        ),
        IndexDefinition(
            name="session_logs_ttl",
            collection="session_logs",
            fields=[("started_at", 1)],
            ttl_seconds=TTL_30_DAYS,
            description="TTL index - auto-delete after 30 days"
        ),
    ])

    # ------------------------------------------------------------------
    # user_sessions
    # ------------------------------------------------------------------
    indexes.extend([
        IndexDefinition(
            name="session_id_unique",
            collection="user_sessions",
            fields=[("session_id", 1)],
            unique=True,
            description="Unique session identifier"
        ),
        IndexDefinition(
            name="user_active_sessions",
            collection="user_sessions",
            fields=[("user_id", 1), ("status", 1)],
            description="User's active sessions lookup"
        ),
        IndexDefinition(
            name="user_session_history",
            collection="user_sessions",
            fields=[("user_id", 1), ("created_at", -1)],
            description="User's session history sorted by time"
        ),
        IndexDefinition(
            name="status_sessions",
            collection="user_sessions",
            fields=[("status", 1), ("created_at", -1)],
            description="Active sessions by creation time"
        ),
        IndexDefinition(
            name="course_sessions",
            collection="user_sessions",
            fields=[("course_id", 1), ("created_at", -1)],
            sparse=True,
            description="Course-based session analytics"
        ),
        IndexDefinition(
            name="lesson_sessions",
            collection="user_sessions",
            fields=[("lesson_id", 1), ("created_at", -1)],
            sparse=True,
            description="Lesson-based session analytics"
        ),
        IndexDefinition(
            name="user_sessions_ttl",
            collection="user_sessions",
            fields=[("created_at", 1)],
            ttl_seconds=TTL_30_DAYS,
            description="TTL index - auto-delete after 30 days"
        ),
    ])

    # ------------------------------------------------------------------
    # flashcards
    # ------------------------------------------------------------------
    indexes.extend([
        IndexDefinition(
            name="qr_id_unique",
            collection="flashcards",
            fields=[("qr_id", 1)],
            unique=True,
            description="Unique QR code identifier"
        ),
        IndexDefinition(
            name="category_difficulty",
            collection="flashcards",
            fields=[("category", 1), ("difficulty", 1)],
            description="Category and difficulty based queries"
        ),
        IndexDefinition(
            name="teacher_id_idx",
            collection="flashcards",
            fields=[("teacher_id", 1)],
            sparse=True,
            description="Teacher's flashcards lookup"
        ),
        IndexDefinition(
            name="deck_id_idx",
            collection="flashcards",
            fields=[("deck_id", 1), ("created_at", 1)],
            sparse=True,
            description="Flashcards in deck ordered by creation"
        ),
        IndexDefinition(
            name="is_active_idx",
            collection="flashcards",
            fields=[("is_active", 1)],
            description="Active flashcard filter"
        ),
        IndexDefinition(
            name="flashcard_decks_ttl",
            collection="flashcard_decks",
            fields=[("created_at", 1)],
            ttl_seconds=TTL_365_DAYS,
            description="TTL for deck metadata - 365 days"
        ),
    ])

    # ------------------------------------------------------------------
    # flashcard_decks
    # ------------------------------------------------------------------
    indexes.extend([
        IndexDefinition(
            name="deck_id_unique",
            collection="flashcard_decks",
            fields=[("deck_id", 1)],
            unique=True,
            description="Unique deck identifier"
        ),
        IndexDefinition(
            name="teacher_id_idx",
            collection="flashcard_decks",
            fields=[("teacher_id", 1)],
            description="Teacher's decks lookup"
        ),
        IndexDefinition(
            name="teacher_active_decks",
            collection="flashcard_decks",
            fields=[("teacher_id", 1), ("is_active", 1)],
            description="Teacher's active decks"
        ),
        IndexDefinition(
            name="is_active_idx",
            collection="flashcard_decks",
            fields=[("is_active", 1)],
            description="Active deck filter"
        ),
        IndexDefinition(
            name="category_idx",
            collection="flashcard_decks",
            fields=[("category", 1)],
            description="Category-based deck queries"
        ),
    ])

    # ------------------------------------------------------------------
    # learning_progress
    # ------------------------------------------------------------------
    indexes.extend([
        IndexDefinition(
            name="user_id_idx",
            collection="learning_progress",
            fields=[("user_id", 1)],
            description="User's learning progress lookup"
        ),
        IndexDefinition(
            name="flashcard_qr_id_idx",
            collection="learning_progress",
            fields=[("flashcard_qr_id", 1)],
            description="Flashcard progress lookup"
        ),
        IndexDefinition(
            name="user_flashcard_unique",
            collection="learning_progress",
            fields=[("user_id", 1), ("flashcard_qr_id", 1)],
            unique=True,
            description="Unique constraint on user + flashcard"
        ),
        IndexDefinition(
            name="user_mastery",
            collection="learning_progress",
            fields=[("user_id", 1), ("mastery_level", -1)],
            description="User's mastery leaderboard"
        ),
        IndexDefinition(
            name="mastered_items_partial",
            collection="learning_progress",
            fields=[("mastery_level", -1)],
            partial_filter={"mastery_level": {"$gte": 3}},
            description="Partial index for mastered items"
        ),
        IndexDefinition(
            name="next_review_idx",
            collection="learning_progress",
            fields=[("next_review_at", 1)],
            sparse=True,
            description="Spaced repetition review queue"
        ),
    ])

    # ------------------------------------------------------------------
    # course_lessons
    # ------------------------------------------------------------------
    indexes.extend([
        IndexDefinition(
            name="lesson_id_unique",
            collection="course_lessons",
            fields=[("lesson_id", 1)],
            unique=True,
            description="Unique lesson identifier"
        ),
        IndexDefinition(
            name="course_id_idx",
            collection="course_lessons",
            fields=[("course_id", 1)],
            description="Course's lessons lookup"
        ),
        IndexDefinition(
            name="course_lessons_order",
            collection="course_lessons",
            fields=[("course_id", 1), ("order", 1)],
            description="Ordered lessons within a course"
        ),
        IndexDefinition(
            name="status_lesson_type",
            collection="course_lessons",
            fields=[("status", 1), ("lesson_type", 1)],
            description="Status and type based queries"
        ),
        IndexDefinition(
            name="creator_content",
            collection="course_lessons",
            fields=[("created_by", 1), ("status", 1)],
            description="Creator's content by status"
        ),
        IndexDefinition(
            name="title_text_search",
            collection="course_lessons",
            fields=[("$**", 1)],  # Will be converted to text index
            description="Full-text search on title/description"
        ),
    ])

    # ------------------------------------------------------------------
    # quiz_attempts
    # ------------------------------------------------------------------
    indexes.extend([
        IndexDefinition(
            name="user_id_idx",
            collection="quiz_attempts",
            fields=[("user_id", 1)],
            description="User's quiz attempts lookup"
        ),
        IndexDefinition(
            name="user_quiz_history",
            collection="quiz_attempts",
            fields=[("user_id", 1), ("attempted_at", -1)],
            description="User's quiz history sorted by time"
        ),
        IndexDefinition(
            name="user_quiz_type",
            collection="quiz_attempts",
            fields=[("user_id", 1), ("quiz_type", 1)],
            description="User's attempts by quiz type"
        ),
        IndexDefinition(
            name="quiz_attempts_ttl",
            collection="quiz_attempts",
            fields=[("attempted_at", 1)],
            ttl_seconds=TTL_90_DAYS,
            description="TTL index - auto-delete after 90 days"
        ),
    ])

    # ------------------------------------------------------------------
    # redis_cache
    # ------------------------------------------------------------------
    indexes.extend([
        IndexDefinition(
            name="cache_key_unique",
            collection="redis_cache",
            fields=[("cache_key", 1)],
            unique=True,
            description="Unique cache key"
        ),
        IndexDefinition(
            name="cache_type_idx",
            collection="redis_cache",
            fields=[("cache_type", 1)],
            description="Cache type lookup"
        ),
        IndexDefinition(
            name="cache_type_expiry",
            collection="redis_cache",
            fields=[("cache_type", 1), ("expires_at", 1)],
            description="Cache by type and expiration"
        ),
        IndexDefinition(
            name="cache_ttl",
            collection="redis_cache",
            fields=[("expires_at", 1)],
            ttl_seconds=0,  # TTL = 0 means delete at expiration
            description="Auto-delete expired cache entries"
        ),
        IndexDefinition(
            name="cache_warming",
            collection="redis_cache",
            fields=[("cache_type", 1), ("created_at", 1)],
            description="Cache warming queries"
        ),
    ])

    # ------------------------------------------------------------------
    # users
    # ------------------------------------------------------------------
    indexes.extend([
        IndexDefinition(
            name="email_unique",
            collection="users",
            fields=[("email", 1)],
            unique=True,
            description="Unique email address"
        ),
        IndexDefinition(
            name="username_unique",
            collection="users",
            fields=[("username", 1)],
            unique=True,
            description="Unique username"
        ),
        IndexDefinition(
            name="is_active_idx",
            collection="users",
            fields=[("is_active", 1)],
            description="Active user filter"
        ),
        IndexDefinition(
            name="created_at_idx",
            collection="users",
            fields=[("created_at", -1)],
            description="User creation timeline"
        ),
    ])

    # ------------------------------------------------------------------
    # courses
    # ------------------------------------------------------------------
    indexes.extend([
        IndexDefinition(
            name="course_id_unique",
            collection="courses",
            fields=[("course_id", 1)],
            unique=True,
            description="Unique course identifier"
        ),
        IndexDefinition(
            name="teacher_id_idx",
            collection="courses",
            fields=[("teacher_id", 1)],
            description="Teacher's courses lookup"
        ),
        IndexDefinition(
            name="is_published_idx",
            collection="courses",
            fields=[("is_published", 1)],
            description="Published course filter"
        ),
        IndexDefinition(
            name="teacher_courses",
            collection="courses",
            fields=[("teacher_id", 1), ("is_published", 1)],
            description="Teacher's published courses"
        ),
        IndexDefinition(
            name="category_key_idx",
            collection="courses",
            fields=[("category_key", 1)],
            description="Category-based course queries"
        ),
        IndexDefinition(
            name="level_idx",
            collection="courses",
            fields=[("level", 1)],
            description="Level-based course queries"
        ),
    ])

    # ------------------------------------------------------------------
    # chat_logs
    # ------------------------------------------------------------------
    indexes.extend([
        IndexDefinition(
            name="user_id_idx",
            collection="chat_logs",
            fields=[("user_id", 1)],
            description="User's chat history lookup"
        ),
        IndexDefinition(
            name="user_chat_history",
            collection="chat_logs",
            fields=[("user_id", 1), ("created_at", -1)],
            description="User's chat history sorted by time"
        ),
        IndexDefinition(
            name="session_id_idx",
            collection="chat_logs",
            fields=[("session_id", 1)],
            sparse=True,
            description="Session-based chat queries"
        ),
        IndexDefinition(
            name="chat_logs_ttl",
            collection="chat_logs",
            fields=[("created_at", 1)],
            ttl_seconds=TTL_90_DAYS,
            description="TTL index - auto-delete after 90 days"
        ),
    ])

    # ------------------------------------------------------------------
    # usage_sessions
    # ------------------------------------------------------------------
    indexes.extend([
        IndexDefinition(
            name="session_id_unique",
            collection="usage_sessions",
            fields=[("session_id", 1)],
            unique=True,
            description="Unique usage session identifier"
        ),
        IndexDefinition(
            name="user_id_idx",
            collection="usage_sessions",
            fields=[("user_id", 1)],
            description="User's usage sessions lookup"
        ),
        IndexDefinition(
            name="is_active_idx",
            collection="usage_sessions",
            fields=[("is_active", 1)],
            description="Active session filter"
        ),
        IndexDefinition(
            name="usage_sessions_ttl",
            collection="usage_sessions",
            fields=[("started_at", 1)],
            ttl_seconds=TTL_365_DAYS,
            description="TTL index - auto-delete after 365 days"
        ),
    ])

    # ------------------------------------------------------------------
    # student_progress
    # ------------------------------------------------------------------
    indexes.extend([
        IndexDefinition(
            name="user_id_idx",
            collection="student_progress",
            fields=[("user_id", 1)],
            description="Student progress lookup"
        ),
        IndexDefinition(
            name="teacher_id_idx",
            collection="student_progress",
            fields=[("teacher_id", 1)],
            description="Teacher's students lookup"
        ),
        IndexDefinition(
            name="teacher_students",
            collection="student_progress",
            fields=[("teacher_id", 1), ("last_active", -1)],
            description="Teacher's students by recent activity"
        ),
        IndexDefinition(
            name="last_active_idx",
            collection="student_progress",
            fields=[("last_active", -1)],
            sparse=True,
            description="Active students timeline"
        ),
    ])

    # ------------------------------------------------------------------
    # learning_goals
    # ------------------------------------------------------------------
    indexes.extend([
        IndexDefinition(
            name="user_id_unique",
            collection="learning_goals",
            fields=[("user_id", 1)],
            unique=True,
            description="Unique user learning goals"
        ),
        IndexDefinition(
            name="teacher_id_idx",
            collection="learning_goals",
            fields=[("teacher_id", 1)],
            description="Teacher's students' goals lookup"
        ),
    ])

    return indexes


# ============================================================================
# Index Management Functions
# ============================================================================

class IndexManager:
    """
    MongoDB Index Manager for creating, verifying, and managing indexes.
    
    Usage:
        manager = IndexManager(mongo_url, database_name)
        await manager.run_migration()
        await manager.verify_indexes()
    """

    def __init__(
        self,
        mongo_url: str,
        database_name: str,
        background: bool = True
    ):
        self.mongo_url = mongo_url
        self.database_name = database_name
        self.background = background
        self._client: Optional[AsyncIOMotorClient] = None
        self._db: Optional[AsyncIOMotorDatabase] = None
        self._indexes_created: int = 0
        self._errors: List[str] = []

    @property
    def client(self) -> AsyncIOMotorClient:
        if self._client is None:
            self._client = AsyncIOMotorClient(self.mongo_url)
        return self._client

    @property
    def db(self) -> AsyncIOMotorDatabase:
        if self._db is None:
            self._db = self.client[self.database_name]
        return self._db

    async def close(self):
        """Close the MongoDB client connection."""
        if self._client:
            self._client.close()
            self._client = None
            self._db = None

    async def create_index(
        self,
        collection_name: str,
        index_def: IndexDefinition
    ) -> bool:
        """
        Create a single index on the specified collection.
        
        Args:
            collection_name: Name of the collection
            index_def: IndexDefinition with index configuration
            
        Returns:
            True if index was created successfully, False otherwise
        """
        try:
            collection = self.db[collection_name]

            # Prepare index keys
            keys = index_def.fields

            # Build index options
            options: Dict[str, Any] = {
                "name": index_def.name,
                "background": self.background,
            }

            if index_def.unique:
                options["unique"] = True

            if index_def.sparse:
                options["sparse"] = True

            if index_def.partial_filter:
                options["partialFilterExpression"] = index_def.partial_filter

            # Handle TTL indexes
            if index_def.ttl_seconds is not None:
                options["expireAfterSeconds"] = index_def.ttl_seconds

            # Create the index
            await collection.create_index(keys, **options)

            logger.info(
                f"  ✅ Created index '{index_def.name}' "
                f"on '{collection_name}'"
            )
            self._indexes_created += 1
            return True

        except Exception as e:
            error_msg = f"  ❌ Failed to create index '{index_def.name}': {e}"
            logger.warning(error_msg)
            self._errors.append(error_msg)
            return False

    async def run_migration(
        self,
        collections: Optional[List[str]] = None
    ) -> Tuple[int, List[str]]:
        """
        Run the full index migration.
        
        Args:
            collections: Optional list of collection names to process.
                        If None, processes all collections.
                        
        Returns:
            Tuple of (indexes_created, errors)
        """
        self._indexes_created = 0
        self._errors = []

        logger.info("=" * 70)
        logger.info("MongoDB Index Migration")
        logger.info(f"Database: {self.database_name}")
        logger.info("=" * 70)

        indexes = get_index_definitions()

        # Group indexes by collection
        indexes_by_collection: Dict[str, List[IndexDefinition]] = {}
        for idx in indexes:
            if idx.collection not in indexes_by_collection:
                indexes_by_collection[idx.collection] = []
            indexes_by_collection[idx.collection].append(idx)

        # Process each collection
        for collection_name, collection_indexes in indexes_by_collection.items():
            # Filter by collections if specified
            if collections and collection_name not in collections:
                continue

            logger.info(f"\n📦 Collection: {collection_name}")

            for idx_def in collection_indexes:
                await self.create_index(collection_name, idx_def)

        # Summary
        logger.info("\n" + "=" * 70)
        logger.info(f"✅ Migration Complete: {self._indexes_created} indexes created")
        if self._errors:
            logger.warning(f"⚠️  {len(self._errors)} errors occurred")
            for err in self._errors:
                logger.warning(err)
        logger.info("=" * 70)

        return self._indexes_created, self._errors

    async def verify_indexes(
        self,
        collections: Optional[List[str]] = None
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Verify indexes on all collections.
        
        Args:
            collections: Optional list of collection names to verify.
                        If None, verifies all collections.
                        
        Returns:
            Dictionary mapping collection names to their indexes
        """
        logger.info("\n📊 Index Verification Report")
        logger.info("=" * 70)

        results: Dict[str, List[Dict[str, Any]]] = {}

        # Get all collections if not specified
        if collections is None:
            collections = []
            async for name in self.db.list_collection_names():
                collections.append(name)

        for collection_name in sorted(collections):
            try:
                collection = self.db[collection_name]
                indexes = await collection.index_information()

                index_list: List[Dict[str, Any]] = []
                for idx_name, idx_info in indexes.items():
                    index_entry = {
                        "name": idx_name,
                        "key": idx_info.get("key", {}),
                        "unique": idx_info.get("unique", False),
                        "sparse": idx_info.get("sparse", False),
                        "ttl": idx_info.get("expireAfterSeconds"),
                        "partial_filter": idx_info.get("partialFilterExpression"),
                    }
                    index_list.append(index_entry)

                results[collection_name] = index_list

                # Log summary
                ttl_count = sum(1 for i in index_list if i["ttl"] is not None)
                logger.info(
                    f"  {collection_name}: {len(index_list)} indexes "
                    f"({ttl_count} with TTL)"
                )

            except Exception as e:
                logger.warning(f"  {collection_name}: Error - {e}")
                results[collection_name] = []

        logger.info("=" * 70)
        return results

    async def drop_duplicate_indexes(self) -> int:
        """
        Drop duplicate indexes that have the same key pattern.
        MongoDB sometimes creates duplicate indexes with different names.
        
        Returns:
            Number of duplicate indexes dropped
        """
        dropped = 0
        logger.info("\n🧹 Checking for duplicate indexes...")

        async for collection_name in self.db.list_collection_names():
            collection = self.db[collection_name]
            indexes = await collection.index_information()

            # Track seen key patterns
            seen_keys: Dict[str, str] = {}

            for idx_name, idx_info in indexes.items():
                # Skip default _id_ index
                if idx_name == "_id_":
                    continue

                # Create a hashable key from the index fields
                key_tuple = tuple(sorted(idx_info.get("key", {}).items()))

                if key_tuple in seen_keys:
                    # Duplicate found - drop this one
                    try:
                        await collection.drop_index(idx_name)
                        logger.info(
                            f"  Dropped duplicate: {collection_name}.{idx_name} "
                            f"(same as {seen_keys[key_tuple]})"
                        )
                        dropped += 1
                    except Exception as e:
                        logger.warning(
                            f"  Failed to drop {idx_name}: {e}"
                        )
                else:
                    seen_keys[key_tuple] = idx_name

        return dropped

    async def analyze_missing_indexes(
        self,
        sample_size: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Analyze slow queries to suggest missing indexes.
        
        Note: Requires profiling to be enabled on the database.
        
        Args:
            sample_size: Maximum number of queries to analyze
            
        Returns:
            List of suggested index creations
        """
        suggestions: List[Dict[str, Any]] = []

        try:
            # Get recent slow queries from system.profile
            pipeline = [
                {"$match": {"millis": {"$gt": 100}}},
                {"$sort": {"millis": -1}},
                {"$limit": sample_size},
            ]

            cursor = self.db.system.profile.aggregate(pipeline)
            patterns: Dict[str, int] = {}

            async for doc in cursor:
                # Extract query pattern
                query = doc.get("query", {})
                collection = query.get("$collection", "unknown")

                # Simplified pattern extraction
                keys = list(query.keys())
                if keys:
                    pattern = f"{collection}:{','.join(keys)}"
                    patterns[pattern] = patterns.get(pattern, 0) + 1

            # Generate suggestions
            for pattern, count in patterns.items():
                if count >= 3:  # Only suggest if pattern appears frequently
                    collection, fields = pattern.split(":", 1)
                    suggestions.append({
                        "collection": collection,
                        "fields": fields.split(","),
                        "occurrences": count,
                        "recommendation": f"Consider creating index on {fields}"
                    })

        except Exception as e:
            logger.warning(f"Could not analyze missing indexes: {e}")

        return suggestions


# ============================================================================
# Convenience Functions
# ============================================================================

async def run_index_migration(
    mongo_url: str,
    database_name: str,
    collections: Optional[List[str]] = None
) -> Tuple[int, List[str]]:
    """
    Run the full index migration.
    
    Args:
        mongo_url: MongoDB connection URL
        database_name: Database name
        collections: Optional list of collections to process
        
    Returns:
        Tuple of (indexes_created, errors)
    """
    manager = IndexManager(mongo_url, database_name)
    try:
        return await manager.run_migration(collections)
    finally:
        await manager.close()


async def verify_all_indexes(
    mongo_url: str,
    database_name: str
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Verify all indexes in the database.
    
    Args:
        mongo_url: MongoDB connection URL
        database_name: Database name
        
    Returns:
        Dictionary of collection indexes
    """
    manager = IndexManager(mongo_url, database_name)
    try:
        return await manager.verify_indexes()
    finally:
        await manager.close()


async def verify_collection_indexes(
    mongo_url: str,
    database_name: str,
    collection_name: str
) -> List[Dict[str, Any]]:
    """
    Verify indexes on a specific collection.
    
    Args:
        mongo_url: MongoDB connection URL
        database_name: Database name
        collection_name: Collection to verify
        
    Returns:
        List of index information
    """
    manager = IndexManager(mongo_url, database_name)
    try:
        results = await manager.verify_indexes([collection_name])
        return results.get(collection_name, [])
    finally:
        await manager.close()


def get_ttl_policies() -> Dict[str, TTLPolicy]:
    """Get all configured TTL policies."""
    return TTL_POLICIES.copy()


def get_ttl_policy(name: str) -> Optional[TTLPolicy]:
    """Get a specific TTL policy by name."""
    return TTL_POLICIES.get(name)


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import sys
    import os

    # Add project root to path
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    sys.path.insert(0, project_root)

    from settings import settings

    async def main():
        """Main entry point for running index migration."""
        print("\n" + "=" * 70)
        print("MongoDB Index Optimization")
        print("=" * 70)

        # Run migration
        created, errors = await run_index_migration(
            settings.MONGO_URL,
            settings.MONGO_DB
        )

        # Verify
        print("\n📊 Verification Report:")
        await verify_all_indexes(settings.MONGO_URL, settings.MONGO_DB)

        # Print TTL policies
        print("\n📅 Configured TTL Policies:")
        for name, policy in get_ttl_policies().items():
            print(f"  {name}: {policy.days} days ({policy.collection}.{policy.ttl_field})")

        print("\n" + "=" * 70)
        print(f"Complete! {created} indexes created.")
        print("=" * 70 + "\n")

    asyncio.run(main())
