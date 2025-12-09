"""
AI Service - Business logic for AI-powered features using LangChain Core
Uses langchain-core and langchain-google-genai (no full langchain dependency)
"""
from typing import List, Dict, Any
import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from settings import settings
import logging

logger = logging.getLogger(__name__)

from repositories.ai_repository import get_ai_repository


class AIService:
    """
    AI Service with RAG (Retrieval-Augmented Generation) capabilities
    - Embedding generation for vector search
    - Kid-friendly chatbot with flashcard context
    """
    
    # Kid-friendly system prompt for RAG chatbot
    RAG_SYSTEM_PROMPT = """Bạn là một trợ lý AI thân thiện dành cho trẻ em học tiếng Anh. 
Hãy trả lời bằng giọng văn vui vẻ, dễ hiểu, và sử dụng emoji phù hợp.

Quy tắc:
- Trả lời ngắn gọn, dễ hiểu cho trẻ em
- Sử dụng emoji để làm sinh động câu trả lời 🌟
- Dựa vào thông tin trong Context để trả lời chính xác
- Nếu không tìm thấy thông tin trong Context, hãy nói "Mình chưa biết từ này, bạn thử hỏi thầy cô nhé! 📚"
- Không bịa đặt thông tin

Context về các flashcard:
{context}

Hãy trả lời câu hỏi của bé dựa trên context trên."""

    def __init__(self):
        self.repo = get_ai_repository()
        self._embedding_model = "models/embedding-001"
        
        if settings.GOOGLE_API_KEY:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=settings.GOOGLE_API_KEY
            )
            self.output_parser = StrOutputParser()
            logger.info("[AI] Service initialized with Gemini 1.5 Flash")
        else:
            logger.warning("GOOGLE_API_KEY not set. AI features disabled.")
            self.llm = None
            self.output_parser = None

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate 768-dimensional embedding using Gemini embedding model.
        
        Args:
            text: Text to generate embedding for
            
        Returns:
            List of 768 floats representing the embedding vector
        """
        if not settings.GOOGLE_API_KEY:
            logger.warning("[AI] Cannot generate embedding: GOOGLE_API_KEY not set")
            return []
        
        if not text or not text.strip():
            logger.warning("[AI] Cannot generate embedding: empty text")
            return []
        
        try:
            result = genai.embed_content(
                model=self._embedding_model,
                content=text,
                task_type="retrieval_document"
            )
            embedding = result['embedding']
            logger.debug(f"[AI] Generated embedding with {len(embedding)} dimensions")
            return embedding
        except Exception as e:
            logger.error(f"[AI] Embedding generation failed: {e}")
            return []

    async def generate_query_embedding(self, query: str) -> List[float]:
        """
        Generate embedding for search query (uses retrieval_query task type).
        """
        if not settings.GOOGLE_API_KEY or not query or not query.strip():
            return []
        
        try:
            result = genai.embed_content(
                model=self._embedding_model,
                content=query,
                task_type="retrieval_query"
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"[AI] Query embedding generation failed: {e}")
            return []

    async def chat_with_rag(
        self, 
        question: str, 
        context_flashcards: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        RAG-enabled chat using retrieved flashcard context.
        
        Args:
            question: User's question
            context_flashcards: List of relevant flashcards from vector search
            
        Returns:
            Dict with response text and source flashcards
        """
        if not self.llm:
            return {
                "response": "AI service chưa được cấu hình. 🔧",
                "sources": []
            }
        
        # Build context string from flashcards
        if context_flashcards:
            context_parts = []
            for i, fc in enumerate(context_flashcards, 1):
                word = fc.get('word', 'N/A')
                definition = fc.get('definition', '')
                translation = fc.get('translation', {})
                vi_trans = translation.get('vi', '')
                en_trans = translation.get('en', word)
                
                context_parts.append(
                    f"{i}. Từ vựng: {word}\n"
                    f"   - Tiếng Anh: {en_trans}\n"
                    f"   - Tiếng Việt: {vi_trans}\n"
                    f"   - Mô tả: {definition}"
                )
            context = "\n".join(context_parts)
        else:
            context = "Không tìm thấy flashcard liên quan."
        
        # Build prompt with system instructions
        prompt = ChatPromptTemplate.from_messages([
            ("system", self.RAG_SYSTEM_PROMPT),
            ("human", "{question}")
        ])
        
        try:
            chain = prompt | self.llm | self.output_parser
            response = await chain.ainvoke({
                "context": context,
                "question": question
            })
            
            # Extract source info for response
            sources = [
                {
                    "word": fc.get('word'),
                    "score": fc.get('score', 0)
                }
                for fc in context_flashcards
            ]
            
            return {
                "response": response,
                "sources": sources
            }
        except Exception as e:
            logger.error(f"[AI] RAG chat failed: {e}")
            return {
                "response": "Xin lỗi, có lỗi xảy ra. Bạn thử lại nhé! 🙏",
                "sources": []
            }

    async def chat(self, message: str, context: str = "") -> str:
        """Original chat method (backward compatibility)"""
        if not self.llm:
            return "AI service is not configured."
        
        # Fetch active config or use default
        config = await self.repo.get_active_config()
        system_prompt = config.system_prompt if config else "You are a helpful AI tutor for children learning languages."

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "Context: {context}\n\nKid: {question}")
        ])
        
        chain = prompt | self.llm | self.output_parser
        response = await chain.ainvoke({"context": context, "question": message})
        return response

    async def analyze_pronunciation(self, text: str, audio_transcription: str) -> Dict[str, Any]:
        """
        Analyze pronunciation by comparing target text with transcribed audio.
        Returns score and feedback.
        """
        if not self.llm:
            return {"score": 0, "feedback": "AI not configured"}

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a pronunciation coach for children. Be encouraging and helpful."),
            ("human", "Compare the target sentence '{target}' with the spoken sentence '{actual}'. Rate the pronunciation accuracy from 0-100 and provide simple feedback for a child.")
        ])
        
        chain = prompt | self.llm | self.output_parser
        response = await chain.ainvoke({"target": text, "actual": audio_transcription})
        return {"feedback": response}


def get_ai_service() -> AIService:
    return AIService()

