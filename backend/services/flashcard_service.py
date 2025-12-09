# services/flashcard_service.py
"""
Flashcard Service - Business logic for flashcard operations
Includes AI-powered auto-embedding generation
"""
from typing import Optional, List, Dict, Any
import logging

from repositories.flashcard_repository import FlashcardRepository, get_flashcard_repository
from services.ai_service import AIService, get_ai_service

logger = logging.getLogger(__name__)


class FlashcardService:
    """Service handling flashcard business logic with AI embedding"""
    
    def __init__(
        self, 
        flashcard_repo: FlashcardRepository,
        ai_service: Optional[AIService] = None
    ):
        self.flashcard_repo = flashcard_repo
        self.ai_service = ai_service
    
    async def get_by_qr_id(self, qr_id: str) -> Optional[Dict[str, Any]]:
        """Get flashcard by QR ID"""
        return await self.flashcard_repo.get_by_qr_id(qr_id)
    
    async def get_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get flashcards by category"""
        return await self.flashcard_repo.get_by_category(category)
    
    async def search(self, query: str) -> List[Dict[str, Any]]:
        """Search flashcards by word"""
        return await self.flashcard_repo.search_by_word(query)
    
    def _build_embedding_text(self, flashcard_data: Dict[str, Any]) -> str:
        """
        Build text for embedding generation from flashcard data.
        Combines word, translations, and definition for rich semantic context.
        """
        word = flashcard_data.get('word', '')
        definition = flashcard_data.get('definition', '')
        translation = flashcard_data.get('translation', {})
        
        # Build embedding text
        parts = [f"Word: {word}"]
        
        if translation:
            for lang, trans in translation.items():
                parts.append(f"{lang.upper()}: {trans}")
        
        if definition:
            parts.append(f"Definition: {definition}")
        
        return ". ".join(parts)
    
    async def create_with_embedding(
        self, 
        flashcard_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a new flashcard with auto-generated embedding.
        
        Args:
            flashcard_data: Flashcard data dict
            
        Returns:
            Created flashcard with embedding
        """
        # Generate embedding text
        embedding_text = self._build_embedding_text(flashcard_data)
        logger.info(f"[Flashcard] Generating embedding for: {flashcard_data.get('word')}")
        
        # Generate embedding using AI service
        embedding = []
        if self.ai_service:
            try:
                embedding = await self.ai_service.generate_embedding(embedding_text)
                logger.info(f"[Flashcard] Generated embedding with {len(embedding)} dimensions")
            except Exception as e:
                logger.error(f"[Flashcard] Embedding generation failed: {e}")
        
        # Add embedding to flashcard data
        if embedding:
            flashcard_data['vector_embedding'] = embedding
        
        # Insert into database
        result = await self.flashcard_repo.create(flashcard_data)
        
        return result
    
    async def update_embedding(self, qr_id: str) -> bool:
        """
        Update embedding for an existing flashcard.
        
        Args:
            qr_id: Flashcard QR ID
            
        Returns:
            True if successful
        """
        flashcard = await self.flashcard_repo.get_by_qr_id(qr_id)
        if not flashcard:
            return False
        
        embedding_text = self._build_embedding_text(flashcard)
        
        if self.ai_service:
            embedding = await self.ai_service.generate_embedding(embedding_text)
            if embedding:
                return await self.flashcard_repo.update_embedding(qr_id, embedding)
        
        return False
    
    async def generate_embeddings_for_missing(self, limit: int = 10) -> int:
        """
        Generate embeddings for flashcards that don't have them.
        
        Args:
            limit: Max flashcards to process per batch
            
        Returns:
            Number of flashcards updated
        """
        if not self.ai_service:
            logger.warning("[Flashcard] AI service not available for batch embedding")
            return 0
        
        missing = await self.flashcard_repo.get_flashcards_without_embedding(limit)
        updated = 0
        
        for fc in missing:
            qr_id = fc.get('qr_id')
            if qr_id and await self.update_embedding(qr_id):
                updated += 1
                logger.info(f"[Flashcard] Updated embedding for: {qr_id}")
        
        return updated


def get_flashcard_service() -> FlashcardService:
    """Factory function for dependency injection"""
    flashcard_repo = get_flashcard_repository()
    ai_service = get_ai_service()
    return FlashcardService(flashcard_repo, ai_service)

