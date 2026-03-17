"""
AI Service - Business logic for AI-powered features using LangChain Core
Uses langchain-core and langchain-google-genai (no full langchain dependency)
"""
from typing import List, Dict, Any
from google import genai as google_genai
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

    # Gemini embedding model (3072 dimensions — matches Atlas Vector Search index)
    EMBEDDING_MODEL = "models/gemini-embedding-001"

    def __init__(self):
        self.repo = get_ai_repository()
        self._embedding_model = self.EMBEDDING_MODEL

        if settings.GOOGLE_API_KEY:
            # New google.genai SDK for embeddings
            self._genai_client = google_genai.Client(api_key=settings.GOOGLE_API_KEY)
            # LangChain still uses the old package for chat — that's fine
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=settings.GOOGLE_API_KEY
            )
            self.output_parser = StrOutputParser()
            logger.info("[AI] Service initialized with Gemini 1.5 Flash + gemini-embedding-001")
        else:
            logger.warning("GOOGLE_API_KEY not set. AI features disabled.")
            self._genai_client = None
            self.llm = None
            self.output_parser = None

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate 3072-dimensional embedding using Gemini embedding model.

        Args:
            text: Text to generate embedding for

        Returns:
            List of 3072 floats representing the embedding vector
        """
        if not self._genai_client:
            logger.warning("[AI] Cannot generate embedding: GOOGLE_API_KEY not set")
            return []

        if not text or not text.strip():
            logger.warning("[AI] Cannot generate embedding: empty text")
            return []

        try:
            result = self._genai_client.models.embed_content(
                model=self._embedding_model,
                contents=text,
                config={"task_type": "RETRIEVAL_DOCUMENT"},
            )
            embedding = result.embeddings[0].values
            logger.debug(f"[AI] Generated embedding with {len(embedding)} dimensions")
            return list(embedding)
        except Exception as e:
            logger.error(f"[AI] Embedding generation failed: {e}")
            return []

    async def generate_query_embedding(self, query: str) -> List[float]:
        """
        Generate embedding for search query (uses RETRIEVAL_QUERY task type).
        """
        if not self._genai_client or not query or not query.strip():
            return []

        try:
            result = self._genai_client.models.embed_content(
                model=self._embedding_model,
                contents=query,
                config={"task_type": "RETRIEVAL_QUERY"},
            )
            return list(result.embeddings[0].values)
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

    async def analyze_pronunciation(self, text: str, audio_transcription: str, score: int = -1) -> Dict[str, Any]:
        """
        Analyze pronunciation by comparing target text with transcribed audio.
        Returns structured JSON with message, emoji and stars when score is provided.
        Falls back to plain-text feedback otherwise.
        """
        if not self.llm:
            return {"score": 0, "feedback": "AI not configured"}

        if score >= 0:
            # Structured JSON mode — used by /pronunciation/ai-feedback endpoint
            star_rule = "stars=3 if score>=90, stars=2 if score>=70, stars=1 otherwise"
            structured_prompt = (
                f"The child was asked to say: '{text}'. They said: '{audio_transcription}'. "
                f"Score: {score}/100.\n"
                "Reply with ONLY valid JSON, no markdown:\n"
                '{"message": "<10 words max, encouraging>", "emoji": "<1-3 emojis>", "stars": <1|2|3>}\n'
                f"Rule: {star_rule}. Never criticise. Always encourage."
            )
            prompt = PromptTemplate.from_template("{q}")
            chain = prompt | self.llm | self.output_parser
            response = await chain.ainvoke({"q": structured_prompt})
            return {"feedback": response}

        # Legacy plain-text mode
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a pronunciation coach for children. Be encouraging and helpful."),
            ("human", "Compare the target sentence '{target}' with the spoken sentence '{actual}'. Rate the pronunciation accuracy from 0-100 and provide simple feedback for a child.")
        ])
        chain = prompt | self.llm | self.output_parser
        response = await chain.ainvoke({"target": text, "actual": audio_transcription})
        return {"feedback": response}

    async def generate_quiz(
        self,
        word: str,
        translation: str,
        category: str = "general",
        difficulty: str = "easy",
        num_questions: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Generate kid-friendly quiz questions for a vocabulary word.
        
        Args:
            word: English word
            translation: Vietnamese translation
            category: Word category
            difficulty: easy/medium/hard
            num_questions: Number of questions
            
        Returns:
            List of quiz question dicts
        """
        if not self.llm:
            return self._fallback_quiz(word, translation)
        
        difficulty_map = {
            "easy": "very simple for ages 3-5",
            "medium": "moderate for ages 5-7",
            "hard": "challenging for ages 7-10"
        }
        
        prompt_text = f"""
You are a fun teacher creating vocabulary quiz for Vietnamese children learning English.

Word: "{word}"
Vietnamese: "{translation}"
Category: {category}
Difficulty: {difficulty_map.get(difficulty, "easy")}

Generate exactly {num_questions} multiple-choice questions.
Each question must:
1. Be kid-friendly and fun
2. Have exactly 4 options
3. Have ONE correct answer
4. Include encouraging feedback

Return ONLY valid JSON array:
[
  {{
    "question_text": "Which animal has a trunk?",
    "options": ["Cat", "Elephant", "Dog", "Bird"],
    "correct_answer": "Elephant",
    "hint": "It's big and gray!",
    "celebration_right": "Amazing! 🎉",
    "encouragement_wrong": "Great try! 💪"
  }}
]
"""
        
        try:
            prompt = PromptTemplate.from_template("{question}")
            chain = prompt | self.llm | self.output_parser
            response = await chain.ainvoke({"question": prompt_text})
            
            # Parse JSON from response
            text = response.strip()
            if text.startswith('```'):
                text = text.split('```')[1]
                if text.startswith('json'):
                    text = text[4:]
                text = text.strip()
            
            import json
            questions = json.loads(text)
            logger.info(f"[AI] Generated {len(questions)} quiz questions for '{word}'")
            return questions
            
        except Exception as e:
            logger.error(f"[AI] Quiz generation failed: {e}")
            return self._fallback_quiz(word, translation)
    
    def _fallback_quiz(self, word: str, translation: str) -> List[Dict[str, Any]]:
        """Fallback quiz when AI unavailable"""
        return [{
            "question_text": f"What is '{word}' in Vietnamese?",
            "options": [translation, "Không biết", "Khác", "Thử lại"],
            "correct_answer": translation,
            "hint": f"Think about {word}!",
            "celebration_right": "Excellent! 🎉",
            "encouragement_wrong": "Try again! 💪"
        }]


def get_ai_service() -> AIService:
    return AIService()

