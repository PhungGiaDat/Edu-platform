"""
Script to generate vector embeddings for all flashcards.
Run this after seeding data and before using RAG chatbot.

Usage:
    cd backend
    python -m scripts.generate_embeddings
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from settings import settings
from database.connection import db_manager
from repositories.flashcard_repository import FlashcardRepository
from services.ai_service import AIService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def generate_embeddings_for_flashcards():
    """
    Generate and store vector embeddings for flashcards without embeddings.
    Uses Gemini embedding model (768 dimensions).
    """
    # Check API key
    if not settings.GOOGLE_API_KEY:
        logger.error("❌ GOOGLE_API_KEY not set in .env file!")
        logger.info("Add: GOOGLE_API_KEY=your-api-key to backend/.env")
        return
    
    # Initialize services
    ai_service = AIService()
    flashcard_repo = FlashcardRepository()
    
    # Get flashcards without embeddings
    flashcards = await flashcard_repo.get_flashcards_without_embedding(limit=500)
    
    if not flashcards:
        logger.info("✅ All flashcards already have embeddings!")
        return
    
    logger.info(f"📊 Found {len(flashcards)} flashcards without embeddings")
    
    success_count = 0
    fail_count = 0
    
    for i, fc in enumerate(flashcards, 1):
        qr_id = fc.get("qr_id", "unknown")
        word = fc.get("word", "")
        definition = fc.get("definition", "")
        translation = fc.get("translation", {})
        vi_trans = translation.get("vi", "") if isinstance(translation, dict) else ""
        
        # Create rich text for embedding
        text_for_embedding = f"""
        Word: {word}
        Definition: {definition}
        Vietnamese: {vi_trans}
        """
        
        try:
            # Generate embedding
            embedding = await ai_service.generate_embedding(text_for_embedding)
            
            if embedding and len(embedding) == 768:
                # Save to database
                success = await flashcard_repo.update_embedding(qr_id, embedding)
                
                if success:
                    success_count += 1
                    logger.info(f"✅ [{i}/{len(flashcards)}] {word} ({qr_id})")
                else:
                    fail_count += 1
                    logger.warning(f"⚠️ [{i}/{len(flashcards)}] Failed to save: {word}")
            else:
                fail_count += 1
                logger.warning(f"⚠️ [{i}/{len(flashcards)}] Invalid embedding: {word}")
                
        except Exception as e:
            fail_count += 1
            logger.error(f"❌ [{i}/{len(flashcards)}] Error for {word}: {e}")
        
        # Rate limiting - avoid hitting API limits
        if i % 10 == 0:
            await asyncio.sleep(1)  # 1 second pause every 10 requests
    
    logger.info(f"""
    ========================================
    📊 Embedding Generation Complete!
    ========================================
    ✅ Success: {success_count}
    ❌ Failed: {fail_count}
    📈 Total: {len(flashcards)}
    ========================================
    """)


async def main():
    """Main entry point"""
    logger.info("🚀 Starting embedding generation...")
    logger.info(f"📦 Database: {settings.MONGO_DB}")
    
    try:
        # Test database connection
        if await db_manager.ping():
            logger.info("✅ MongoDB connected")
        else:
            logger.error("❌ MongoDB connection failed!")
            return
        
        # Generate embeddings
        await generate_embeddings_for_flashcards()
        
    finally:
        # Cleanup
        await db_manager.close()
        logger.info("🔌 Database connection closed")


if __name__ == "__main__":
    asyncio.run(main())
