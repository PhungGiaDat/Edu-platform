"""LLM-as-judge for the Agentic RAG benchmark.

Three verdicts:
  - judge_faithfulness(question, response, context, golden)  -> in-domain rows
  - judge_refusal(question, response)                       -> out-of-domain rows
  - judge_consistency(q1, r1, q2, r2)                       -> consistency pairs

Judge model: qwen3.8 (structured JSON) primary, cascade fallback via ModelRouter.
All prompts demand strict JSON output; parsing is fence-tolerant.
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, Optional

ERROR_TYPES = [
    "fabricated_fact",      # khẳng định dữ kiện không có trong context
    "wrong_animal",         # trả về nhầm con vật
    "wrong_language",       # sai ngôn ngữ so với câu hỏi
    "ungrounded_claim",     # khẳng định mập mờ không kiểm chứng được
    "refusal_miss",         # nên từ chối nhưng lại trả lời bừa
    "none",
]

_FAITHFULNESS_PROMPT = """Bạn là giám khảo nghiêm ngặt đánh giá chatbot RAG cho trẻ em 5-10 tuổi.
Đánh giá CÂU TRẢ LỜI có trung thực với NGỮ CẢNH hay không.

Câu hỏi: {question}

Câu trả lời của chatbot: {response}

Ngữ cảnh được retrieve (Context): {context}

Dữ kiện chuẩn (Golden): {golden}

Tiêu chí:
- hallucination = true nếu câu trả lời khẳng định một dữ kiện KHÔNG có trong Context/Golden
- error_types: chọn từ danh sách [fabricated_fact, wrong_animal, wrong_language, ungrounded_claim, refusal_miss, none]
  + fabricated_fact: bịa dữ kiện (số liệu, hành vi, môi trường sống... không có trong context)
  + wrong_animal: trả lời về nhầm con vật khác với câu hỏi
  + wrong_language: trả lời sai ngôn ngữ (hỏi tiếng Việt nhưng trả lời tiếng Anh thuần, hoặc ngược lại)
  + ungrounded_claim: khẳng định mơ hồ kiểu "có thể", "chắc chắn là" không dựa trên context
  + refusal_miss: câu hỏi ngoài khả năng nhưng chatbot vẫn trả lời bừa
  + none: không có lỗi
- faithfulness: 0.0 (hoàn toàn bịa) đến 1.0 (hoàn toàn dựa trên ngữ cảnh)

Chỉ trả lời JSON, không thêm chữ:
{{"faithfulness": 0.0, "hallucination": false, "error_types": ["none"], "reasons": ["lý do ngắn gọn bằng tiếng Việt"]}}"""

_REFUSAL_PROMPT = """Bạn là giám khảo đánh giá chatbot cho trẻ em 5-10 tuổi.
Câu hỏi dưới đây NẰM NGOÀI phạm vi kiến thức của chatbot (chatbot chỉ biết về động vật tiếng Anh cho trẻ em).
Một câu trả lời ĐÚNG là: từ chối lịch sự, nói rằng chưa biết, hoặc gợi ý hỏi thầy cô (vd: "Mình chưa biết từ này, hỏi thầy cô nhé!").
Một câu trả lời SAI là: bịa đặt dữ kiện, hoặc lạc đề trả lời cụ thể như thể biết chắc.

Câu hỏi: {question}

Câu trả lời của chatbot: {response}

Chỉ trả lời JSON, không thêm chữ:
{{"refusal_correct": true, "reasons": ["lý do ngắn gọn bằng tiếng Việt"]}}"""

_CONSISTENCY_PROMPT = """Bạn là giám khảo đánh giá tính nhất quán (consistency) của chatbot RAG cho trẻ em.
Chatbot được hỏi CÙNG MỘT chủ đề (cùng con vật) bằng hai câu hỏi diễn đạt khác nhau.
Đánh giá: hai câu trả lời có nhất quán về DỮ KIỆN CHÍNH không (con vật nào, ăn gì, sống ở đâu, có nguy hiểm không...).
Khác nhau về văn phong/emoji/độ dài là KHÔNG sao. Mâu thuẫn dữ kiện là TRỤT.

Câu hỏi 1: {q1}
Trả lời 1: {r1}

Câu hỏi 2: {q2}
Trả lời 2: {r2}

Chỉ trả lời JSON, không thêm chữ:
{{"consistent": true, "same_animal": true, "reasons": ["lý do ngắn gọn bằng tiếng Việt"]}}"""


def _extract_json(raw: str) -> Optional[Dict[str, Any]]:
    """Parse the first JSON object found in `raw`, tolerating code fences."""
    if not raw:
        return None
    text = raw.strip()
    if text.startswith("```"):
        parts = text.split("```")
        for part in parts:
            candidate = part.strip()
            if candidate.startswith("json"):
                candidate = candidate[4:]
            if candidate.startswith("{"):
                text = candidate.strip()
                break
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        return None
    try:
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None


async def _judge_call(prompt: str, judge_model: Optional[str]) -> Optional[Dict[str, Any]]:
    """Call the judge model with cascade fallback; returns parsed JSON or None.

    `prompt` is fully pre-formatted text — it must NOT pass through
    ChatPromptTemplate again, or literal JSON examples inside it would be
    re-parsed as template variables.
    """
    from services.llm_clients import ModelRouter, acall_with_retry

    async def do_call(llm, _inputs: Dict[str, Any]) -> str:
        response = await acall_with_retry(llm.ainvoke, prompt)
        if isinstance(response, str):
            return response
        return str(getattr(response, "content", "") or "")

    try:
        router = ModelRouter(role="validator", primary_model=judge_model)
        raw, _model_name = await router.call_with_fallback(do_call, {})
        return _extract_json(raw)
    except Exception:  # noqa: BLE001
        return None


async def judge_faithfulness(
    question: str,
    response: str,
    context_docs: list,
    golden_context: Optional[str],
    judge_model: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Grade an in-domain response against retrieved context + golden facts."""
    if context_docs:
        context = "\n".join(
            f"{i}. {str(doc.get('text') or doc).strip()}" for i, doc in enumerate(context_docs, 1)
        )
    else:
        context = "(không có ngữ cảnh retrieve)"
    golden = (golden_context or "").strip() or "(không có)"

    prompt = _FAITHFULNESS_PROMPT.format(
        question=question, response=response, context=context, golden=golden
    )
    verdict = await _judge_call(prompt, judge_model)
    if verdict is None:
        return None
    # normalize enum values
    error_types = [str(e) for e in (verdict.get("error_types") or []) if str(e) in ERROR_TYPES]
    verdict["error_types"] = error_types or ["none"]
    try:
        verdict["faithfulness"] = max(0.0, min(1.0, float(verdict.get("faithfulness", 0.0))))
    except (TypeError, ValueError):
        verdict["faithfulness"] = 0.0
    verdict["hallucination"] = bool(verdict.get("hallucination", False))
    verdict["reasons"] = [str(r) for r in (verdict.get("reasons") or [])][:5]
    return verdict


async def judge_refusal(
    question: str,
    response: str,
    judge_model: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Grade whether an out-of-domain response correctly declines."""
    prompt = _REFUSAL_PROMPT.format(question=question, response=response)
    verdict = await _judge_call(prompt, judge_model)
    if verdict is None:
        return None
    verdict["refusal_correct"] = bool(verdict.get("refusal_correct", False))
    verdict["reasons"] = [str(r) for r in (verdict.get("reasons") or [])][:5]
    return verdict


async def judge_consistency(
    q1: str, r1: str, q2: str, r2: str, judge_model: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Grade fact-level consistency between two answers to paired questions."""
    prompt = _CONSISTENCY_PROMPT.format(q1=q1, r1=r1, q2=q2, r2=r2)
    verdict = await _judge_call(prompt, judge_model)
    if verdict is None:
        return None
    verdict["consistent"] = bool(verdict.get("consistent", False))
    verdict["same_animal"] = bool(verdict.get("same_animal", False))
    verdict["reasons"] = [str(r) for r in (verdict.get("reasons") or [])][:5]
    return verdict
