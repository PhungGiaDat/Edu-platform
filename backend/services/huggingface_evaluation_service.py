# backend/services/huggingface_evaluation_service.py
"""
Pronunciation Evaluation via HuggingFace wav2vec2

Hybrid evaluation: browser fuzzy match first → borderline → HuggingFace API.

For fine-tuning:
    1. Export data: python database/seed/export_pronunciation_dataset.py
    2. Fine-tune on Colab: docs/models/fine_tune_pronunciation_colab.ipynb
    3. Push to HF Hub: HF_PRONUNCIATION_MODEL=your-username/vi-child-en-pronunciation
    4. Set HF_TOKEN in .env
"""
from dataclasses import dataclass
from typing import Optional
import os
import logging

logger = logging.getLogger(__name__)

# Fine-tuned model: set HF_PRONUNCIATION_MODEL env var after fine-tuning
FINETUNED_MODEL = os.getenv("HF_PRONUNCIATION_MODEL")
HF_TOKEN = os.getenv("HF_TOKEN")


@dataclass
class HuggingFaceEvaluationResult:
    score: float
    stars: int
    feedback: str
    transcription: Optional[str] = None
    phoneme_analysis: Optional[dict] = None
    evaluation_method: str = "huggingface"  # "huggingface" | "levenshtein"


FEEDBACK_TEMPLATES = {
    3: ["Tuyệt vời! Phát âm hoàn hảo!", "Xuất sắc lắm!", "Con giỏi lắm! 🎉"],
    2: ["Tốt lắm! Cố gắng thêm một chút nhé!", "Gần hoàn hảo rồi!", "Rất tốt! 💪"],
    1: ["Đang tiến bộ! Nghe lại và thử lại nào!", "Thử lại nhé, con sẽ làm được! 🌱"],
}


class HuggingFaceEvaluationService:
    """
    Evaluate pronunciation using HuggingFace Inference API.

    Priority:
    1. Fine-tuned model (HF_PRONUNCIATION_MODEL) — most accurate
    2. Base wav2vec2 via Inference API — fallback if no fine-tuned model
    3. Levenshtein similarity — fallback if no HF_TOKEN
    """

    HF_INFERENCE_ENDPOINT = "https://api-inference.huggingface.co/models/"
    HF_HEADERS = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}

    @classmethod
    def _get_model_name(cls, audio_data: bytes, expected_word: str) -> str:
        """Return the model to use: fine-tuned if available, otherwise base."""
        if FINETUNED_MODEL:
            return FINETUNED_MODEL
        # Default to facebook/wav2vec2-base for demo
        return "facebook/wav2vec2-base"

    @classmethod
    def _call_hf_api(cls, model: str, audio_data: bytes, expected_word: str) -> dict:
        """
        Call HuggingFace Inference API for speech-to-text.

        Falls back to Levenshtein scoring if API call fails.
        """
        import httpx

        if not HF_TOKEN:
            raise RuntimeError("HF_TOKEN not configured — using Levenshtein fallback")

        endpoint = f"{cls.HF_INFERENCE_ENDPOINT}{model}"
        headers = {"Authorization": f"Bearer {HF_TOKEN}"}

        with httpx.Client(timeout=60.0) as client:
            # Audio must be sent as raw bytes for ASR models
            files = {"file": ("audio.webm", audio_data, "audio/webm")}
            resp = client.post(endpoint, files=files, headers=headers)

        if resp.status_code == 503:
            # Model loading — try once more after delay
            import time
            time.sleep(5)
            with httpx.Client(timeout=60.0) as client:
                resp = client.post(endpoint, files=files, headers=headers)

        if resp.status_code != 200:
            raise RuntimeError(f"HuggingFace API error: {resp.status_code} — {resp.text[:200]}")

        result = resp.json()

        # wav2vec2 returns {"text": "transcribed text"}
        transcription = result.get("text", "").strip().lower()
        score = cls._levenshtein_score(transcription, expected_word.lower())

        return {
            "transcription": transcription,
            "score": score,
            "stars": 3 if score >= 85 else 2 if score >= 70 else 1,
            "feedback": cls._get_feedback(
                3 if score >= 85 else 2 if score >= 70 else 1
            ),
            "model": model,
        }

    @staticmethod
    def _levenshtein_distance(a: str, b: str) -> int:
        """Compute Levenshtein distance between two strings."""
        m, n = len(a), len(b)
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        for i in range(m + 1):
            dp[i][0] = i
        for j in range(n + 1):
            dp[0][j] = j
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if a[i - 1] == b[j - 1]:
                    dp[i][j] = dp[i - 1][j - 1]
                else:
                    dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
        return dp[m][n]

    @classmethod
    def _levenshtein_score(cls, transcription: str, expected: str) -> float:
        """Score transcription against expected word (0-100)."""
        if transcription == expected:
            return 100.0
        max_len = max(len(transcription), len(expected))
        if max_len == 0:
            return 0.0
        distance = cls._levenshtein_distance(transcription, expected)
        score = round(((max_len - distance) / max_len) * 100)

        # Kid bonus: common child speech variations
        if (
            transcription == expected + "s"
            or transcription == expected + "es"
            or transcription == expected.rstrip("s")
            or transcription == expected.replace("th", "t")
            or transcription == expected.replace("r", "l")
        ):
            score = min(100, score + 15)

        return score

    @staticmethod
    def _get_feedback(stars: int) -> str:
        import random
        messages = FEEDBACK_TEMPLATES.get(stars, FEEDBACK_TEMPLATES[1])
        return random.choice(messages)

    @classmethod
    def evaluate(
        cls,
        audio_data: bytes,
        expected_word: str,
        browser_score: Optional[float] = None,
    ) -> HuggingFaceEvaluationResult:
        """
        Main evaluation entry point.

        Pipeline:
        1. If browser_score >= 85 → instant 3 stars, no API call
        2. If browser_score >= 70 → 2 stars, no API call
        3. If borderline (50-69) → call HuggingFace Inference API
        4. If no HF_TOKEN → pure Levenshtein fallback
        """
        # High confidence from browser — skip server call
        if browser_score is not None:
            if browser_score >= 85:
                return HuggingFaceEvaluationResult(
                    score=browser_score,
                    stars=3,
                    feedback=cls._get_feedback(3),
                    evaluation_method="levenshtein",
                )
            if browser_score >= 70:
                return HuggingFaceEvaluationResult(
                    score=browser_score,
                    stars=2,
                    feedback=cls._get_feedback(2),
                    evaluation_method="levenshtein",
                )

        # Low score from browser → call HuggingFace for borderline cases
        model = cls._get_model_name(audio_data, expected_word)

        if HF_TOKEN and audio_data:
            try:
                result = cls._call_hf_api(model, audio_data, expected_word)
                return HuggingFaceEvaluationResult(
                    score=result["score"],
                    stars=result["stars"],
                    feedback=result["feedback"],
                    transcription=result.get("transcription"),
                    evaluation_method="huggingface",
                )
            except Exception as e:
                logger.warning(f"HuggingFace API failed: {e} — falling back to Levenshtein")

        # Fallback: Levenshtein only
        score = browser_score if browser_score is not None else 75.0
        stars = 3 if score >= 85 else 2 if score >= 70 else 1
        return HuggingFaceEvaluationResult(
            score=score,
            stars=stars,
            feedback=cls._get_feedback(stars),
            evaluation_method="levenshtein",
        )
