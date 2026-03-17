"""
Agentic RAG Service — Planner → Generator → Validator Pipeline

Architecture:
  1. PLANNER   — Queries MongoDB for user learning progress → determines topic/difficulty/focus
  2. GENERATOR — Vector-searches flashcards using plan, calls LLM to draft response
  3. VALIDATOR — Checks quality, age-appropriateness, dedup vs recent chat history

Free-tier Gemini constraints:
  - 1-second delay between agent LLM calls to stay within RPM limits
  - Exponential backoff on 429 errors (5s → 10s → 20s, max 3 retries)
  - MongoDB-backed response caching (rag_cache collection, 24h TTL)
  - Compressed prompts to minimize token usage

API key safety:
  - Always reads settings.GOOGLE_API_KEY at call time — never cached at init
"""

import asyncio
import hashlib
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import google.generativeai as genai
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from database.connection import db_manager
from repositories.flashcard_repository import FlashcardRepository
from settings import settings

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────
INTER_AGENT_DELAY = 1.0          # seconds between LLM calls (free tier RPM safety)
MAX_RETRIES = 3                  # max 429 retries per agent
BACKOFF_DELAYS = [5, 10, 20]     # seconds (exponential backoff)
CACHE_TTL_HOURS = 24             # MongoDB rag_cache document lifetime
CACHE_COLLECTION = "rag_cache"
CHAT_LOG_COLLECTION = "chat_logs"
LEARNING_PROGRESS_COLLECTION = "learning_progress"


# ──────────────────────────────────────────────
# Helper: LLM call with retry on 429
# ──────────────────────────────────────────────
async def _call_llm_with_retry(chain, inputs: Dict[str, Any], agent_name: str) -> str:
    """Invoke a LangChain chain with exponential backoff on 429 / ResourceExhausted errors."""
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            result = await chain.ainvoke(inputs)
            return result
        except Exception as e:
            error_str = str(e).lower()
            is_rate_limit = (
                "429" in error_str
                or "resource_exhausted" in error_str
                or "quota" in error_str
                or "rate" in error_str
            )
            if is_rate_limit and attempt < MAX_RETRIES - 1:
                delay = BACKOFF_DELAYS[attempt]
                logger.warning(
                    f"[AgenticRAG] {agent_name} hit rate limit (attempt {attempt+1}/{MAX_RETRIES}). "
                    f"Retrying in {delay}s..."
                )
                await asyncio.sleep(delay)
                last_error = e
            else:
                raise e
    raise last_error  # type: ignore


# ──────────────────────────────────────────────
# Helper: cache key
# ──────────────────────────────────────────────
def _cache_key(question: str, user_id: Optional[str]) -> str:
    raw = f"{question.strip().lower()}|{user_id or 'anon'}"
    return hashlib.sha256(raw.encode()).hexdigest()


# ──────────────────────────────────────────────
# Agentic RAG Service
# ──────────────────────────────────────────────
class AgenticRAGService:
    """
    Three-agent RAG pipeline for the kids' English learning chatbot.

    Usage:
        service = AgenticRAGService()
        result = await service.run(question, user_id, session_id, flashcard_repo)
        # result: {"response": str, "sources": list, "cached": bool, "agent_trace": list}
    """

    # ── Prompts ──────────────────────────────────────────────────────────────

    PLANNER_PROMPT = ChatPromptTemplate.from_messages([
        ("system",
         "Bạn là AI lập kế hoạch học tập cho trẻ em. "
         "Phân tích câu hỏi và dữ liệu tiến trình học để xác định:\n"
         "1. Chủ đề chính (topic)\n"
         "2. Từ khóa tìm kiếm (keywords, tối đa 5 từ)\n"
         "3. Mức độ khó phù hợp (difficulty: easy/medium/hard)\n"
         "4. Ngôn ngữ trả lời (vi/en/bilingual)\n"
         "Chỉ trả lời JSON, ví dụ:\n"
         '{"topic":"animals","keywords":["elephant","animal","jungle"],'
         '"difficulty":"easy","language":"bilingual"}\n'
         "Dữ liệu tiến trình:\n{progress_summary}"
        ),
        ("human", "Câu hỏi: {question}")
    ])

    GENERATOR_PROMPT = ChatPromptTemplate.from_messages([
        ("system",
         "Bạn là trợ lý AI thân thiện dành cho trẻ em học tiếng Anh. "
         "Trả lời vui vẻ, ngắn gọn, dùng emoji phù hợp 🌟\n"
         "Quy tắc:\n"
         "- Ngắn gọn (tối đa 3-4 câu)\n"
         "- Dựa vào Context để trả lời chính xác\n"
         "- Nếu không tìm thấy: 'Mình chưa biết từ này, hỏi thầy cô nhé! 📚'\n"
         "- Không bịa đặt\n"
         "Context flashcard:\n{context}"
        ),
        ("human", "Câu hỏi: {question}")
    ])

    VALIDATOR_PROMPT = ChatPromptTemplate.from_messages([
        ("system",
         "Bạn kiểm tra chất lượng câu trả lời cho trẻ em (5-10 tuổi). "
         "Nếu câu trả lời đạt yêu cầu, chỉ trả về nguyên văn câu trả lời đó.\n"
         "Nếu có vấn đề, sửa và trả về bản đã sửa.\n"
         "Tiêu chí:\n"
         "- Phù hợp lứa tuổi (không bạo lực, không tiêu cực)\n"
         "- Ngắn gọn, rõ ràng\n"
         "- Không trùng lặp với lịch sử chat gần đây\n"
         "Lịch sử gần đây:\n{recent_history}\n"
         "Câu trả lời cần kiểm tra:"
        ),
        ("human", "{draft_response}")
    ])

    # ── Init ─────────────────────────────────────────────────────────────────

    def __init__(self):
        self._parser = StrOutputParser()

    def _get_llm(self) -> Optional[ChatGoogleGenerativeAI]:
        """Always read API key from settings at call time — supports key rotation."""
        api_key = settings.GOOGLE_API_KEY
        if not api_key:
            return None
        genai.configure(api_key=api_key)
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=api_key,
            temperature=0.4,
        )

    # ── Cache ─────────────────────────────────────────────────────────────────

    async def _get_cache(self, key: str) -> Optional[Dict[str, Any]]:
        try:
            db = db_manager.db
            if db is None:
                return None
            doc = await db[CACHE_COLLECTION].find_one(
                {"key": key, "expires_at": {"$gt": datetime.utcnow()}}
            )
            if doc:
                logger.info("[AgenticRAG] Cache hit")
                return doc["payload"]
        except Exception as e:
            logger.warning(f"[AgenticRAG] Cache read error: {e}")
        return None

    async def _set_cache(self, key: str, payload: Dict[str, Any]) -> None:
        try:
            db = db_manager.db
            if db is None:
                return
            await db[CACHE_COLLECTION].update_one(
                {"key": key},
                {"$set": {
                    "key": key,
                    "payload": payload,
                    "expires_at": datetime.utcnow() + timedelta(hours=CACHE_TTL_HOURS),
                    "created_at": datetime.utcnow(),
                }},
                upsert=True
            )
        except Exception as e:
            logger.warning(f"[AgenticRAG] Cache write error: {e}")

    # ── Learning Progress ─────────────────────────────────────────────────────

    async def _get_progress_summary(self, user_id: Optional[str]) -> str:
        """Fetch recent learning progress for the Planner agent."""
        if not user_id:
            return "Chưa có dữ liệu tiến trình (khách vãng lai)."
        try:
            db = db_manager.db
            if db is None:
                return "Không thể truy cập dữ liệu tiến trình."
            cursor = db[LEARNING_PROGRESS_COLLECTION].find(
                {"user_id": user_id},
                {"flashcard_qr_id": 1, "mastery_level": 1, "times_viewed": 1,
                 "last_reviewed_at": 1, "_id": 0}
            ).sort("last_reviewed_at", -1).limit(10)
            docs = await cursor.to_list(length=10)
            if not docs:
                return "Người dùng chưa học flashcard nào."
            lines = []
            for d in docs:
                lines.append(
                    f"- {d.get('flashcard_qr_id', '?')}: "
                    f"mastery={d.get('mastery_level', 0)}/5, "
                    f"views={d.get('times_viewed', 0)}"
                )
            return "\n".join(lines)
        except Exception as e:
            logger.warning(f"[AgenticRAG] Progress query failed: {e}")
            return "Không thể truy cập dữ liệu tiến trình."

    # ── Recent Chat History ────────────────────────────────────────────────────

    async def _get_recent_history(self, session_id: str, limit: int = 5) -> str:
        """Fetch recent AI responses for the Validator to check for duplicates."""
        try:
            db = db_manager.db
            if db is None:
                return "Không có lịch sử."
            cursor = db[CHAT_LOG_COLLECTION].find(
                {"session_id": session_id, "sender": "ai"},
                {"message": 1, "_id": 0}
            ).sort("timestamp", -1).limit(limit)
            docs = await cursor.to_list(length=limit)
            if not docs:
                return "Không có lịch sử."
            return "\n---\n".join(d["message"] for d in docs)
        except Exception as e:
            logger.warning(f"[AgenticRAG] History query failed: {e}")
            return "Không có lịch sử."

    # ── Agent 1: Planner ──────────────────────────────────────────────────────

    async def _planner(
        self,
        question: str,
        user_id: Optional[str],
        llm: ChatGoogleGenerativeAI,
        agent_trace: List[str],
    ) -> Dict[str, Any]:
        """
        Planner Agent: Analyse the question + user progress.
        Returns a plan dict: {topic, keywords, difficulty, language}
        Falls back gracefully if LLM fails.
        """
        logger.info("[AgenticRAG] 🧠 Planner agent starting...")
        agent_trace.append("planner:start")

        progress_summary = await self._get_progress_summary(user_id)
        chain = self.PLANNER_PROMPT | llm | self._parser

        try:
            raw = await _call_llm_with_retry(
                chain,
                {"question": question, "progress_summary": progress_summary},
                agent_name="Planner"
            )
            # Parse JSON from the LLM response
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            plan = json.loads(raw.strip())
            logger.info(f"[AgenticRAG] Planner result: {plan}")
            agent_trace.append(f"planner:done topic={plan.get('topic','?')}")
            return plan
        except Exception as e:
            logger.warning(f"[AgenticRAG] Planner fallback (parse/LLM error): {e}")
            agent_trace.append("planner:fallback")
            # Fallback: use the raw question as keywords
            return {
                "topic": "general",
                "keywords": question.split()[:5],
                "difficulty": "easy",
                "language": "bilingual"
            }

    # ── Agent 2: Generator ────────────────────────────────────────────────────

    async def _generator(
        self,
        question: str,
        plan: Dict[str, Any],
        flashcard_repo: FlashcardRepository,
        llm: ChatGoogleGenerativeAI,
        agent_trace: List[str],
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Generator Agent: Vector-search flashcards using plan keywords, build LLM response.
        Returns (draft_response, sources)
        """
        logger.info("[AgenticRAG] ⚡ Generator agent starting...")
        agent_trace.append("generator:start")

        # Build enriched search query from plan keywords
        keywords = plan.get("keywords", [])
        topic = plan.get("topic", "")
        search_query = " ".join([topic] + keywords) if keywords else question

        # Generate embedding for the enriched query
        api_key = settings.GOOGLE_API_KEY
        context_flashcards: List[Dict[str, Any]] = []
        if api_key:
            try:
                genai.configure(api_key=api_key)
                embed_result = genai.embed_content(
                    model="models/embedding-001",
                    content=search_query,
                    task_type="retrieval_query"
                )
                query_vector = embed_result["embedding"]
                context_flashcards = await flashcard_repo.vector_search(
                    query_vector=query_vector,
                    limit=3
                )
                logger.info(f"[AgenticRAG] Generator found {len(context_flashcards)} flashcards")
            except Exception as e:
                logger.warning(f"[AgenticRAG] Generator embedding/search failed: {e}")

        # Build context string
        if context_flashcards:
            parts = []
            for i, fc in enumerate(context_flashcards, 1):
                word = fc.get("word", "N/A")
                vi = fc.get("translation", {}).get("vi", "")
                en = fc.get("translation", {}).get("en", word)
                definition = fc.get("definition", "")
                parts.append(
                    f"{i}. {word}: EN={en}, VI={vi}. {definition}"
                )
            context = "\n".join(parts)
        else:
            context = "Không tìm thấy flashcard liên quan."

        # LLM call
        chain = self.GENERATOR_PROMPT | llm | self._parser
        try:
            draft = await _call_llm_with_retry(
                chain,
                {"question": question, "context": context},
                agent_name="Generator"
            )
            agent_trace.append(f"generator:done sources={len(context_flashcards)}")
        except Exception as e:
            logger.error(f"[AgenticRAG] Generator LLM failed: {e}")
            draft = "Xin lỗi, mình gặp sự cố. Bạn thử lại nhé! 🙏"
            agent_trace.append("generator:error")

        sources = [
            {"word": fc.get("word"), "score": fc.get("score", 0)}
            for fc in context_flashcards
        ]
        return draft, sources

    # ── Agent 3: Validator ────────────────────────────────────────────────────

    async def _validator(
        self,
        draft_response: str,
        session_id: str,
        llm: ChatGoogleGenerativeAI,
        agent_trace: List[str],
    ) -> str:
        """
        Validator Agent: Quality-check the draft, ensure age-appropriateness,
        remove duplicates vs recent history.
        Returns the final validated response.
        """
        logger.info("[AgenticRAG] ✅ Validator agent starting...")
        agent_trace.append("validator:start")

        recent_history = await self._get_recent_history(session_id)
        chain = self.VALIDATOR_PROMPT | llm | self._parser

        try:
            validated = await _call_llm_with_retry(
                chain,
                {"draft_response": draft_response, "recent_history": recent_history},
                agent_name="Validator"
            )
            agent_trace.append("validator:done")
            return validated.strip()
        except Exception as e:
            logger.warning(f"[AgenticRAG] Validator fallback: {e}")
            agent_trace.append("validator:fallback")
            return draft_response  # Return draft as-is if validator fails

    # ── Main Entry Point ──────────────────────────────────────────────────────

    async def run(
        self,
        question: str,
        user_id: Optional[str],
        session_id: str,
        flashcard_repo: FlashcardRepository,
    ) -> Dict[str, Any]:
        """
        Run the full Planner → Generator → Validator pipeline.

        Returns:
            {
                "response": str,       # Final validated response
                "sources": list,       # Flashcard sources used
                "cached": bool,        # True if served from cache
                "agent_trace": list,   # Debug trace of agent steps
            }
        """
        agent_trace: List[str] = []

        # ── 1. Check cache first ──────────────────────────────────────────────
        cache_key = _cache_key(question, user_id)
        cached = await self._get_cache(cache_key)
        if cached:
            cached["cached"] = True
            cached["agent_trace"] = ["cache:hit"]
            return cached

        # ── 2. Check LLM availability ─────────────────────────────────────────
        llm = self._get_llm()
        if not llm:
            return {
                "response": "AI chưa được cấu hình. Vui lòng liên hệ quản trị viên. 🔧",
                "sources": [],
                "cached": False,
                "agent_trace": ["error:no_api_key"]
            }

        # ── 3. PLANNER ────────────────────────────────────────────────────────
        plan = await self._planner(question, user_id, llm, agent_trace)

        # Delay between agents (free tier RPM protection)
        await asyncio.sleep(INTER_AGENT_DELAY)

        # ── 4. GENERATOR ─────────────────────────────────────────────────────
        draft_response, sources = await self._generator(
            question, plan, flashcard_repo, llm, agent_trace
        )

        # Delay between agents
        await asyncio.sleep(INTER_AGENT_DELAY)

        # ── 5. VALIDATOR ──────────────────────────────────────────────────────
        final_response = await self._validator(draft_response, session_id, llm, agent_trace)

        # ── 6. Cache the result ───────────────────────────────────────────────
        result = {
            "response": final_response,
            "sources": sources,
            "cached": False,
            "agent_trace": agent_trace,
        }
        await self._set_cache(cache_key, result)

        return result


# ── Dependency injection factory ───────────────────────────────────────────────

def get_agentic_rag_service() -> AgenticRAGService:
    return AgenticRAGService()
