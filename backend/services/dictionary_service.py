# backend/services/dictionary_service.py
"""
Dictionary Service - AI-powered translation using Qdrant RAG
"""
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)


class DictionaryService:
    """Service for AI dictionary/translation"""

    def __init__(self):
        self._rag_service = None

    async def _get_rag_service(self):
        """Lazy load RAG service"""
        if self._rag_service is None:
            try:
                from services.qdrant_rag_service import QdrantRAGService
                self._rag_service = QdrantRAGService()
            except Exception as e:
                logger.warning(f"[Dictionary] RAG service not available: {e}")
                self._rag_service = None
        return self._rag_service

    async def translate(
        self,
        text: str,
        context: Optional[str] = None,
        target_lang: str = "vi",
    ) -> dict:
        """
        Translate text using AI with Qdrant wiki context.

        Args:
            text: English text to translate
            context: Optional context sentence/paragraph
            target_lang: Target language (default: vi)

        Returns:
            Dictionary with translation, word breakdown, and related words
        """
        logger.info(f"[Dictionary] Translating: {text[:50]}...")

        # Get RAG context from Qdrant
        rag_context = []
        rag_service = await self._get_rag_service()

        if rag_service:
            try:
                results = await rag_service.search(text, limit=3)
                rag_context = [r.get("text", "") for r in results if r.get("text")]
                logger.info(f"[Dictionary] Found {len(rag_context)} RAG results")
            except Exception as e:
                logger.warning(f"[Dictionary] RAG search failed: {e}")

        # Build translation prompt
        prompt = self._build_translation_prompt(text, context, rag_context, target_lang)

        # Call AI for translation
        translation_result = await self._call_translation_ai(prompt, target_lang)

        return {
            "original": text,
            "translation": translation_result,
            "word_breakdown": self._extract_word_breakdown(text, translation_result.get("vi", "")),
            "related_words": self._extract_related_words(rag_context),
            "sources": rag_context[:2] if rag_context else None,
        }

    def _build_translation_prompt(
        self,
        text: str,
        context: Optional[str],
        rag_context: List[str],
        target_lang: str,
    ) -> str:
        """Build prompt for AI translation"""
        context_part = f"\nContext: {context}" if context else ""
        rag_part = "\n\nReference information:\n" + "\n".join(f"- {c}" for c in rag_context) if rag_context else ""

        return f"""You are a friendly English tutor for children (ages 5-12).

Translate the following English text to {target_lang.upper()}.
{context_part}
{rag_part}

Provide:
1. Natural translation suitable for children
2. Brief explanation if helpful
3. Word-by-word breakdown

Format your response as JSON:
{{
  "vi": "translation",
  "literalTranslation": "word-by-word if different",
  "contextualNote": "brief explanation for children"
}}

English text: {text}"""

    async def _call_translation_ai(self, prompt: str, target_lang: str) -> dict:
        """Call AI for translation"""
        try:
            from services.ai_service import AIService
            ai_service = AIService()

            response = await ai_service.generate(prompt)

            # Parse JSON from response
            import json
            import re

            # Extract JSON from response
            json_match = re.search(r'\{[^{}]*"vi"[^{}]*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())

            # Fallback: return basic structure
            return {"vi": response[:200], "contextualNote": ""}

        except Exception as e:
            logger.error(f"[Dictionary] AI translation failed: {e}")
            return {"vi": "[Translation unavailable]", "contextualNote": str(e)}

    def _extract_word_breakdown(self, original: str, translation: str) -> List[dict]:
        """Extract word-by-word breakdown"""
        words = original.split()
        trans_words = translation.split()

        breakdown = []
        for i, word in enumerate(words[:10]):  # Limit to 10 words
            clean_word = ''.join(c for c in word if c.isalnum()).lower()
            if clean_word:
                breakdown.append({
                    "word": word,
                    "pronunciation": f"/{clean_word}/",  # Placeholder
                    "part_of_speech": None,
                    "translation": trans_words[i] if i < len(trans_words) else "",
                })

        return breakdown

    def _extract_related_words(self, rag_context: List[str]) -> List[dict]:
        """Extract related words from RAG context"""
        # Simple extraction - in production would use NLP
        related = []
        for ctx in rag_context[:3]:
            words = ctx.split()[:3]
            for w in words:
                clean = ''.join(c for c in w if c.isalnum()).lower()
                if len(clean) > 3 and clean not in [r.get("word", "").lower() for r in related]:
                    related.append({
                        "word": w,
                        "translation": "",
                        "relevance_score": 0.8,
                    })
                    if len(related) >= 5:
                        break

        return related
