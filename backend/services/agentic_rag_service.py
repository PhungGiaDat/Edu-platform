"""
Agentic RAG Service — Planner → Generator → Validator Pipeline

Architecture:
  1. PLANNER   — Queries learning progress → determines topic/difficulty/focus
  2. GENERATOR — Retrieves Qdrant context using the plan, calls LLM to draft response
  3. VALIDATOR — Rule-based content protection (rag_content_rules: banned terms,
                 refusal echo/rotation, length bounds, dedup) with LLM escalation
                 only for drafts a rule cannot fix. settings.VALIDATOR_MODE="llm"
                 restores the legacy always-LLM validation.

TokenRouter multi-model routing:
  - Planner → Qwen3.8 (structured JSON extraction)
  - Generator → DeepSeek-V4-Pro (narrative generation)
  - Validator → Nemotron-3 (escalation only in "rule" mode; every answer in "llm" mode)
  - Fallback cascade: if primary model fails → next in MODEL_FALLBACKS list
  - Circuit breaker per model: fail_max=5 → skip for 60s
  - Centralized tenacity retry: wait_exponential(2-30s), max 3 attempts

MongoDB-backed response caching (rag_cache collection, 24h TTL).
"""

import asyncio
import hashlib
import json
import logging
import time
import uuid as _uuid
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Tuple

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from sqlalchemy import text
from services.cache_service import cache_service
from services.rag_observability import build_rag_trace_row, schedule_rag_trace
from services.rag_trace_context import begin_sink, end_sink, mark_stage
from repositories.postgres_chat_log_repository import PostgresChatLogRepository
from database.postgres_connection import postgres_pool
from settings import settings
from services.llm_clients import (
    ModelRouter,
    acall_with_retry,
)
from services.qdrant_rag_service import (
    QdrantRAGService,
    QdrantRAGUnavailable,
    get_qdrant_rag_service,
)
from services.rag_content_rules import REFUSAL_VARIANTS, evaluate_answer
from repositories.learning_progress_repository import LearningProgressRepository
from repositories.chat_repository import ChatRepository

if TYPE_CHECKING:
    from langchain_core.language_models.chat_base import BaseChatModel

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────
INTER_AGENT_DELAY = 1.0          # seconds between LLM calls (free tier RPM safety)
CACHE_TTL_HOURS = 24            # MongoDB rag_cache document lifetime

# Rendered into GENERATOR_PROMPT; kept in sync with the validator's
# refusal-echo detection (services/rag_content_rules.REFUSAL_VARIANTS).
_REFUSAL_PROMPT_LINES = "\n".join(f"  - {v}" for v in REFUSAL_VARIANTS)


# ──────────────────────────────────────────────
# Helper: cache key
# ──────────────────────────────────────────────
def _cache_key(question: str, user_id: Optional[str], retrieval_version: str) -> str:
    raw = f"{question.strip().lower()}|{user_id or 'anon'}|{retrieval_version}"
    return hashlib.sha256(raw.encode()).hexdigest()


# ──────────────────────────────────────────────
# Agentic RAG Service
# ──────────────────────────────────────────────
class AgenticRAGService:
    """
    Three-agent RAG pipeline for the kids' English learning chatbot.

    Usage:
        service = AgenticRAGService()
        result = await service.run(question, user_id, session_id)
        # result: {"response": str, "sources": list, "cached": bool, "agent_trace": list}
    """

    # ── Prompts ──────────────────────────────────────────────────────────────

    PLANNER_PROMPT = ChatPromptTemplate.from_messages([
        ("system",
         "Bạn là AI lập kế hoạch học tập cho trẻ em. "
         "Phân tích câu hỏi và dữ liệu tiến trình học để xác định:\n"
         "1. Chủ đề chính (topic)\n"
         "2. Từ khóa tìm kiếm (keywords, tối đa 5 từ). Keywords must be short English retrieval search terms, even when the child asks in Vietnamese.\n"
         "3. Mức độ khó phù hợp (difficulty: easy/medium/hard)\n"
         "4. Ngôn ngữ trả lời (vi/en/bilingual)\n"
         "Chỉ trả lời JSON, ví dụ:\n"
         '{{"topic":"animals","keywords":["elephant","animal","jungle"],'
         '"difficulty":"easy","language":"bilingual"}}\n'
         "Dữ liệu tiến trình:\n{progress_summary}"
        ),
        ("human", "Câu hỏi: {question}")
    ])

    GENERATOR_PROMPT = ChatPromptTemplate.from_messages([
        ("system",
         "Bạn là trợ lý AI thân thiện của ứng dụng học tiếng Anh cho trẻ em (5-10 tuổi), chủ đề động vật. "
         "Giọng vui vẻ, gần gũi, dùng 1-2 emoji phù hợp 🌟\n"
         "Quy tắc:\n"
         "- Trả lời 4-6 câu theo đúng cấu trúc:\n"
         "  (1) Mở đầu bằng câu trả lời trực tiếp cho câu hỏi, bằng tiếng Việt;\n"
         "  (2)-(3) Kể 1-2 dữ kiện thú vị về con vật, CHỈ lấy từ Context, diễn đạt lại tự nhiên (không chép nguyên văn Context);\n"
         "  (4) Cho 1 câu tiếng Anh mẫu đơn giản kèm nghĩa tiếng Việt và 1-2 từ vựng, ví dụ: Dogs run fast. = Chó chạy rất nhanh. (dog: con chó);\n"
         "  (5) Kết bằng 1 câu hỏi nhỏ gợi tò mò, ví dụ: Con biết tiếng kêu của nó không?\n"
         "- CHỈ dùng thông tin có trong Context. Không tự thêm màu sắc, số đo, tốc độ, tuổi thọ, nơi sống... nếu Context không nói tới.\n"
         "- Nếu Context nói về con vật được hỏi nhưng KHÔNG có đúng thuộc tính con hỏi (màu, kích thước, giấc ngủ...): "
         "trả lời phần Context CÓ, rồi nói rõ 'Bài học của mình chưa có thông tin về [X] nhé'. Tuyệt đối không đoán.\n"
         "- Nếu Context không có thông tin liên quan: từ chối nhẹ nhàng và chọn 1 cách diễn đạt dưới đây, "
         "KHÔNG dùng lại nguyên văn cách đã xuất hiện trong lịch sử chat gần đây:\n"
         + _REFUSAL_PROMPT_LINES + "\n"
         "- Không lặp lại nguyên văn câu hỏi của trẻ làm mở đầu câu trả lời.\n"
         "Qdrant kid-learning context (animals + Wikipedia summaries):\n{context}"
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
         "- QUAN TRỌNG: KHÔNG được thêm dữ kiện mới (màu sắc, số đo, tốc độ, tuổi thọ...) "
         "mà bản nháp chưa có — bạn KHÔNG có tài liệu tham khảo, chỉ được chỉnh câu chữ. "
         "Nếu bản nháp quá cụt hoặc không chắc chắn, thay bằng một lời từ chối nhẹ nhàng, "
         "khác nguyên văn các lời từ chối trong lịch sử gần đây.\n"
         "Lịch sử gần đây:\n{recent_history}\n"
         "Câu trả lời cần kiểm tra:"
        ),
        ("human", "{draft_response}")
    ])

    # ── Init ─────────────────────────────────────────────────────────────────

    def __init__(
        self,
        retriever: Optional[QdrantRAGService] = None,
        progress_repo: Optional[LearningProgressRepository] = None,
        chat_repo: Optional[ChatRepository] = None,
    ):
        self._parser = StrOutputParser()
        self._retriever = retriever or get_qdrant_rag_service()
        self._progress_repo = progress_repo
        self._chat_repo = chat_repo

    @staticmethod
    def _resolve_llm(role: str, override: Optional[str] = None) -> "BaseChatModel":
        """Build the LLM for a role using ModelRouter primary."""
        router = ModelRouter(role=role, primary_model=override)
        return router.get_llm()

    async def _llm_call(
        self,
        llm: "BaseChatModel",
        prompt: ChatPromptTemplate,
        inputs: Dict[str, Any],
        agent_name: str,
    ) -> str:
        """Call LLM via chain with centralized retry."""
        chain = prompt | llm | self._parser
        return await acall_with_retry(chain.ainvoke, inputs)

    # ── Cache ─────────────────────────────────────────────────────────────────

    async def _get_cache(self, key: str) -> Optional[Dict[str, Any]]:
        try:
            cached = await cache_service.get(key)
            if cached:
                logger.info("[AgenticRAG] Cache hit")
                return cached
        except Exception as e:
            logger.warning(f"[AgenticRAG] Cache read error: {e}")
        return None

    async def _set_cache(self, key: str, payload: Dict[str, Any]) -> None:
        try:
            await cache_service.set(key, payload, ttl_seconds=CACHE_TTL_HOURS * 3600)
        except Exception as e:
            logger.warning(f"[AgenticRAG] Cache write error: {e}")

    # Learning Progress ─────────────────────────────────────────────────────

    async def _get_progress_summary(self, user_id: Optional[str]) -> str:
        """Fetch recent learning progress for the Planner agent."""
        if not user_id:
            return "Chưa có dữ liệu tiến trình (khách vãng lai)."
        try:
            if self._progress_repo is not None:
                docs = await self._progress_repo.get_all_for_user(user_id, limit=10)
            else:
                from database.orm_session import session_factory
                async with session_factory()() as session:
                    result = await session.execute(
                        text(
                            "SELECT flashcard_qr_id, mastery_level, times_viewed "
                            "FROM learning_progress WHERE user_id = :user_id "
                            "ORDER BY last_reviewed_at DESC NULLS LAST LIMIT 10"
                        ),
                        {"user_id": user_id},
                    )
                    docs = [dict(row) for row in result.mappings().all()]
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

    async def _get_recent_history_texts(self, session_id: str, limit: int = 5) -> List[str]:
        """Recent AI responses as raw strings (for rule checks and the validator prompt)."""
        try:
            if self._chat_repo is not None:
                docs = await self._chat_repo.find_many(
                    filter={"session_id": session_id, "sender": "ai"},
                    limit=limit,
                    sort=[("timestamp", -1)],
                )
            else:
                rows = await PostgresChatLogRepository().get_session_history(
                    session_id, limit=200
                )
                ai_messages = [
                    row["message"] for row in rows if row.get("sender") == "ai"
                ]
                docs = [{"message": m} for m in ai_messages[-limit:]]
            return [str(d.get("message", "")) for d in docs if d.get("message")]
        except Exception as e:
            logger.warning(f"[AgenticRAG] History query failed: {e}")
            return []

    async def _get_recent_history(self, session_id: str, limit: int = 5) -> str:
        """Fetch recent AI responses for the Validator to check for duplicates."""
        texts = await self._get_recent_history_texts(session_id, limit)
        return "\n---\n".join(texts) if texts else "Không có lịch sử."

    # ── Agent 1: Planner ──────────────────────────────────────────────────────

    async def _planner(
        self,
        question: str,
        user_id: Optional[str],
        model_override: Optional[str],
        agent_trace: List[str],
        lesson_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Planner Agent: Analyse the question + user progress.
        Returns a plan dict: {topic, keywords, difficulty, language}
        Falls back gracefully if LLM fails.
        """
        logger.info("[AgenticRAG] 🧠 Planner agent starting...")
        agent_trace.append("planner:start")

        progress_summary = await self._get_progress_summary(user_id)
        lesson_id = (lesson_context or {}).get("lessonId")
        if lesson_id:
            progress_summary += f"\nĐang mở bài học: {lesson_id} (ưu tiên chủ đề này nếu câu hỏi liên quan)."

        async def do_call(llm: "BaseChatModel", inputs: Dict[str, Any]) -> str:
            chain = self.PLANNER_PROMPT | llm | self._parser
            return await acall_with_retry(chain.ainvoke, inputs)

        try:
            router = ModelRouter(role="planner", primary_model=model_override)
            raw, model_name = await router.call_with_fallback(
                do_call,
                {"question": question, "progress_summary": progress_summary},
            )
            agent_trace.append(f"planner:done model={model_name}")
            # Parse JSON
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            plan = json.loads(raw.strip())
            logger.info(f"[AgenticRAG] Planner result: {plan}")
            return plan
        except Exception as e:
            logger.warning(f"[AgenticRAG] Planner fallback (parse/LLM error): {e}")
            agent_trace.append("planner:fallback")
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
        model_override: Optional[str],
        agent_trace: List[str],
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Generator Agent: Retrieve approved Qdrant context using plan keywords, build LLM response.
        Returns (draft_response, sources, model_name)
        """
        logger.info("[AgenticRAG] ⚡ Generator agent starting...")
        agent_trace.append("generator:start")

        # Build an English retrieval query from the Planner result.
        raw_keywords = plan.get("keywords", [])
        if isinstance(raw_keywords, str):
            raw_keywords = [raw_keywords]
        elif raw_keywords is None:
            raw_keywords = []
        else:
            try:
                raw_keywords = list(raw_keywords)
            except TypeError:
                raw_keywords = [raw_keywords]

        topic = str(plan.get("topic") or "").strip()
        keywords = [str(keyword).strip() for keyword in raw_keywords if str(keyword).strip()]
        search_query = " ".join(part for part in [topic, *keywords] if part) or question

        context_documents: List[Dict[str, Any]] = []
        _r0 = time.perf_counter()
        try:
            context_documents = await self._retriever.retrieve(search_query)
            logger.info(f"[AgenticRAG] Generator found {len(context_documents)} Qdrant documents")
        except QdrantRAGUnavailable:
            logger.warning("[AgenticRAG] Qdrant retrieval unavailable; continuing without context")
        finally:
            mark_stage("retrieval", time.perf_counter() - _r0)

        # Build context string
        context_texts = [str(document.get("text") or "").strip() for document in context_documents]
        context_texts = [text for text in context_texts if text]
        if context_texts:
            parts = [f"{index}. {text}" for index, text in enumerate(context_texts, 1)]
            context = "\n".join(parts)
        else:
            context = "Không tìm thấy tài liệu động vật Qdrant liên quan."

        sources = [
            {"word": document.get("animal_en"), "score": float(document.get("score", 0))}
            for document in context_documents
        ]

        # LLM call via cascade
        async def do_call(llm: "BaseChatModel", inputs: Dict[str, Any]) -> str:
            chain = self.GENERATOR_PROMPT | llm | self._parser
            return await acall_with_retry(chain.ainvoke, inputs)

        try:
            router = ModelRouter(role="generator", primary_model=model_override)
            draft, model_name = await router.call_with_fallback(
                do_call,
                {"question": question, "context": context},
            )
            agent_trace.append(f"generator:done model={model_name} sources={len(context_documents)}")
            return draft, sources
        except Exception as e:
            logger.error(f"[AgenticRAG] Generator LLM failed: {e}")
            draft = "Xin lỗi, mình gặp sự cố. Bạn thử lại nhé! 🙏"
            agent_trace.append("generator:error")
            return draft, sources

    # ── Agent 3: Validator ────────────────────────────────────────────────────

    async def _validator(
        self,
        draft_response: str,
        session_id: str,
        model_override: Optional[str],
        agent_trace: List[str],
        sources: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """
        Validator stage: deterministic content protection by default.

        Rule mode (settings.VALIDATOR_MODE="rule"): rag_content_rules checks banned
        terms, refusal echo/repetition, length bounds and duplicates. Drafts that
        pass are returned untouched (~0ms); a rule-sanitizable flag is fixed in
        code; only what rules cannot fix escalates to the LLM validator.

        LLM mode ("llm", an explicit validator_model override, or escalation):
        the legacy LLM quality/age-appropriateness check runs.
        Returns the final validated response.
        """
        use_llm = bool(model_override) or settings.VALIDATOR_MODE.strip().lower() == "llm"
        history = await self._get_recent_history_texts(session_id)

        if not use_llm:
            verdict = evaluate_answer(draft_response, history, bool(sources))
            if not verdict.needs_llm:
                if verdict.flags:
                    agent_trace.append(f"validator:rule-fix [{','.join(verdict.flags)}]")
                    logger.info(f"[AgenticRAG] 🛡 Validator rule-fix: {verdict.flags}")
                else:
                    agent_trace.append("validator:rule-pass")
                    logger.info("[AgenticRAG] 🛡 Validator rules passed (no LLM call)")
                return verdict.sanitized
            agent_trace.append(f"validator:rule-escalate [{','.join(verdict.flags)}]")
            logger.info(f"[AgenticRAG] 🛡 Validator escalating to LLM: {verdict.flags}")
            draft_response = verdict.sanitized

        logger.info("[AgenticRAG] ✅ Validator LLM starting...")
        agent_trace.append("validator:start")
        # Only pay the inter-call delay when we are actually issuing another LLM call.
        await asyncio.sleep(INTER_AGENT_DELAY)

        recent_history = "\n---\n".join(history) if history else "Không có lịch sử."

        async def do_call(llm: "BaseChatModel", inputs: Dict[str, Any]) -> str:
            chain = self.VALIDATOR_PROMPT | llm | self._parser
            return await acall_with_retry(chain.ainvoke, inputs)

        try:
            router = ModelRouter(role="validator", primary_model=model_override)
            validated, model_name = await router.call_with_fallback(
                do_call,
                {"draft_response": draft_response, "recent_history": recent_history},
            )
            agent_trace.append(f"validator:done model={model_name}")
            return validated.strip() or draft_response
        except Exception as e:
            logger.warning(f"[AgenticRAG] Validator fallback: {e}")
            agent_trace.append("validator:fallback")
            return draft_response  # sanitized/draft as-is if validator fails

    # ── Main Entry Point ──────────────────────────────────────────────────────

    async def run(
        self,
        question: str,
        user_id: Optional[str],
        session_id: str,
        planner_model: Optional[str] = None,
        generator_model: Optional[str] = None,
        validator_model: Optional[str] = None,
        lesson_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Run the full Planner → Generator → Validator pipeline.

        Optional model overrides allow the caller to route specific stages
        to non-default models (e.g., from a model picker UI).

        Returns:
            {
                "response": str,       # Final validated response
                "sources": list,       # Qdrant animal-document sources used
                "cached": bool,        # True if served from cache
                "agent_trace": list,   # Debug trace of agent steps + model used
            }
        """
        agent_trace: List[str] = []

        # ── Ops monitoring (P1): bind a per-request TraceSink. Strict no-op
        # downstream when MONITORING_ENABLED is false (schedule short-circuits).
        request_id = str(_uuid.uuid4())
        sink_token, sink = begin_sink()
        started = time.perf_counter()
        plan: Optional[Dict[str, Any]] = None
        final_response: Optional[str] = None
        sources: List[Dict[str, Any]] = []
        cache_hit = False
        error_text: Optional[str] = None

        try:
            # ── 1. Check cache first ──────────────────────────────────────────
            cache_key = _cache_key(question, user_id, settings.qdrant_retrieval_version)
            cached = await self._get_cache(cache_key)
            if cached:
                cached["cached"] = True
                cached["agent_trace"] = ["cache:hit"]
                cache_hit = True
                sources = list(cached.get("sources") or [])
                final_response = cached.get("response")
                return cached

            # ── 2. PLANNER ────────────────────────────────────────────────────
            _t0 = time.perf_counter()
            plan = await self._planner(
                question, user_id, planner_model, agent_trace, lesson_context
            )
            mark_stage("planner", time.perf_counter() - _t0)
            await asyncio.sleep(INTER_AGENT_DELAY)

            # ── 3. GENERATOR ──────────────────────────────────────────────────
            _t0 = time.perf_counter()
            draft_response, sources = await self._generator(
                question, plan, generator_model, agent_trace
            )
            mark_stage("generator", time.perf_counter() - _t0)

            # ── 4. VALIDATOR ─────────────────────────────────────────────────
            # Rule mode adds no LLM call, so the inter-call delay is paid inside
            # _validator only when it actually escalates to the LLM.
            _t0 = time.perf_counter()
            final_response = await self._validator(
                draft_response, session_id, validator_model, agent_trace, sources
            )
            mark_stage("validator", time.perf_counter() - _t0)

            # ── 5. Cache the result ───────────────────────────────────────────
            result = {
                "response": final_response,
                "sources": sources,
                "cached": False,
                "agent_trace": agent_trace,
            }
            await self._set_cache(cache_key, result)

            return result
        except Exception as exc:  # noqa: BLE001 - record then preserve behavior
            error_text = str(exc)
            raise
        finally:
            try:
                row = build_rag_trace_row(
                    request_id=request_id,
                    question=question,
                    user_id=user_id,
                    session_id=session_id,
                    sink=sink,
                    agent_trace=agent_trace,
                    final_response=final_response,
                    sources=sources,
                    total_seconds=time.perf_counter() - started,
                    language=(plan or {}).get("language"),
                    generator_model_requested=generator_model or settings.MODEL_GENERATOR,
                    cache_hit=cache_hit,
                    error=error_text,
                )
                if cache_hit:
                    row["validator_verdict"] = "cache-hit"
                schedule_rag_trace(row)
            except Exception as trace_exc:  # noqa: BLE001
                logger.debug(f"[AgenticRAG] trace build failed (ignored): {trace_exc}")
            end_sink(sink_token)


# ── Dependency injection factory ───────────────────────────────────────────────

def get_agentic_rag_service() -> AgenticRAGService:
    return AgenticRAGService(
        progress_repo=LearningProgressRepository(),
        chat_repo=ChatRepository(),
    )
