"""
OpenRouter Lexi Chat Service
Lightweight, isolated client for streaming kid English tutor chat with 2-model failover.
Zero dependencies on legacy RAG / ModelRouter / Qdrant.
"""
import asyncio
import json
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional
import httpx
from settings import settings

logger = logging.getLogger(__name__)

KID_SAFE_FALLBACK = "Lexi đang bận một chút. Bé thử lại sau nhé!"

SYSTEM_PROMPT = (
    "You are Lexi, a cheerful, friendly AI English tutor for kids aged 6-12. "
    "Keep answers short (1-3 sentences), simple, engaging, and encouraging. "
    "Use fun emojis and simple words. If the child speaks Vietnamese, reply warmly "
    "in simple Vietnamese mixed with English vocabulary to help them learn. "
    "Always maintain a safe, positive, and educational environment. "
    "Never ask for or share personal information."
)


def assemble_context(
    question: str,
    recent_history: Optional[List[Dict[str, Any]]] = None,
    lesson_context: Optional[Any] = None,
) -> List[Dict[str, str]]:
    """Assemble kid-safe prompt without PII, keeping up to 4 recent history turns."""
    sys_prompt = SYSTEM_PROMPT
    if lesson_context:
        if isinstance(lesson_context, str) and lesson_context.strip():
            sys_prompt += f"\nCurrent lesson context: {lesson_context.strip()}"
        elif isinstance(lesson_context, dict) and lesson_context:
            sys_prompt += f"\nCurrent lesson context: {json.dumps(lesson_context, ensure_ascii=False)}"

    messages: List[Dict[str, str]] = [{"role": "system", "content": sys_prompt}]

    if recent_history:
        for turn in recent_history[-4:]:
            sender = turn.get("sender") or turn.get("role")
            role = "assistant" if sender in ("ai", "assistant") else "user"
            msg = turn.get("message") or turn.get("content") or ""
            if msg:
                messages.append({"role": role, "content": str(msg)})

    messages.append({"role": "user", "content": question})
    return messages


async def _iter_openrouter_stream(
    client: httpx.AsyncClient,
    model: str,
    messages: List[Dict[str, str]],
) -> AsyncGenerator[str, None]:
    """Stream token deltas from OpenRouter chat completions."""
    base_url = settings.OPENROUTER_BASE_URL.rstrip("/")
    url = f"{base_url}/chat/completions"
    api_key = settings.OPENROUTER_API_KEY.get_secret_value() if settings.OPENROUTER_API_KEY else ""
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is not configured")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://eduplatform.app",
        "X-Title": "EduPlatform Lexi Chatbot",
    }
    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
    }

    async with client.stream(
        "POST",
        url,
        headers=headers,
        json=payload,
        timeout=httpx.Timeout(connect=10.0, read=45.0, write=10.0, pool=10.0),
    ) as response:
        response.raise_for_status()
        async for line in response.aiter_lines():
            line = line.strip()
            if not line:
                continue
            if line.startswith("data: "):
                data_str = line[6:].strip()
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                except json.JSONDecodeError:
                    continue
                if "error" in data:
                    err_msg = data.get("error", {}).get("message", "OpenRouter error")
                    raise RuntimeError(f"OpenRouter upstream error: {err_msg}")
                choices = data.get("choices") or []
                if choices:
                    delta = choices[0].get("delta") or {}
                    token = delta.get("content")
                    if token:
                        yield token


async def stream_chat_with_fallback(
    question: str,
    recent_history: Optional[List[Dict[str, Any]]] = None,
    lesson_context: Optional[Any] = None,
) -> AsyncGenerator[str, None]:
    """
    Stream SSE chat tokens using OpenRouter with 2-model failover.
    Primary: settings.CHAT_PRIMARY_MODEL (5s timeout)
    Fallback: settings.CHAT_FALLBACK_MODEL (8s timeout)
    """
    logger.info(
        f"[LexiChat] route=/api/v1/chat/stream provider=openrouter primary={settings.CHAT_PRIMARY_MODEL}"
    )

    messages = assemble_context(
        question=question,
        recent_history=recent_history,
        lesson_context=lesson_context,
    )

    primary_model = settings.CHAT_PRIMARY_MODEL
    primary_timeout = float(settings.CHAT_PRIMARY_START_TIMEOUT_MS) / 1000.0

    fallback_model = settings.CHAT_FALLBACK_MODEL
    fallback_timeout = float(settings.CHAT_FALLBACK_START_TIMEOUT_MS) / 1000.0

    has_emitted_token = False
    active_stream: Optional[AsyncGenerator[str, None]] = None
    active_model = primary_model

    async with httpx.AsyncClient() as client:
        # 1. Attempt Primary Model
        try:
            gen = _iter_openrouter_stream(client, primary_model, messages)
            first_token = await asyncio.wait_for(gen.__anext__(), timeout=primary_timeout)
            has_emitted_token = True
            active_stream = gen
            yield f"data: {json.dumps({'token': first_token})}\n\n"
        except (Exception, asyncio.CancelledError) as e:
            reason = f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
            logger.warning(
                f"[LexiChat] fallback=true model={fallback_model} reason={reason}"
            )
            try:
                if "gen" in locals():
                    await gen.aclose()
            except Exception:
                pass

        # 2. If Primary failed before first token, attempt Fallback Model
        if not has_emitted_token:
            active_model = fallback_model
            try:
                gen = _iter_openrouter_stream(client, fallback_model, messages)
                first_token = await asyncio.wait_for(gen.__anext__(), timeout=fallback_timeout)
                has_emitted_token = True
                active_stream = gen
                yield f"data: {json.dumps({'token': first_token})}\n\n"
            except (Exception, asyncio.CancelledError) as e:
                reason = f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
                logger.warning(
                    f"[LexiChat] fallback failed model={fallback_model} reason={reason}"
                )
                try:
                    if "gen" in locals():
                        await gen.aclose()
                except Exception:
                    pass

        # 3. If both failed before emitting any token: return kid-safe fallback
        if not has_emitted_token or active_stream is None:
            yield f"data: {json.dumps({'token': KID_SAFE_FALLBACK})}\n\n"
            yield "data: [DONE]\n\n"
            return

        # 4. Stream remainder of active model. If stream fails mid-sentence, emit [ERROR]
        try:
            async for token in active_stream:
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(
                f"[LexiChat] stream interrupted after first token model={active_model} error={type(e).__name__}: {e}"
            )
            yield "data: [ERROR]\n\n"
