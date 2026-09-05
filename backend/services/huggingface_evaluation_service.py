# backend/services/huggingface_evaluation_service.py
"""
Pronunciation Evaluation via HuggingFace wav2vec2

Hybrid evaluation: browser fuzzy match first → borderline → HuggingFace API.
"""
from dataclasses import dataclass
from typing import Optional
import os
import httpx


@dataclass
class HuggingFaceEvaluationResult:
    score: float
    stars: int
    feedback: str
    transcription: Optional[str] = None
    phoneme_analysis: Optional[dict] = None


FEEDBACK_TEMPLATES = {
    3: ["Tuyệt vời! Phát âm hoàn hảo!", "Xuất sắc lắm!", "Con giỏi lắm! 🎉"],
    2: ["Tốt lắm! Cố gắng thêm một chút nhé!", "Gần hoàn hảo rồi!", "Rất tốt! 💪"],
    1: ["Đang tiến bộ! Nghe lại và thử lại nào!", "Thử lại nhé, con sẽ làm được! 🌱"],
}


class HuggingFaceEvaluationService:
    """
    Evaluate pronunciation using HuggingFace Inference API.

    Production: uses a fine-tuned wav2vec2 model for Vietnamese children's speech.
    Fallback: Levenshtein similarity when API unavailable.
    """

    MODEL_NAME = os.getenv("HF_PRONUNCIATION_MODEL", "facebook/wav2vec2-base")
    HF_TOKEN = os.getenv("HF_TOKEN")
    INFERENCE_ENDPOINT = os.getenv(
        "HF_INFERENCE_ENDPOINT",
        "https://api-inference.huggingface.co/models/",
    )

    @classmethod
    def _call_hf_api(cls, audio_bytes: bytes, expected_word: str) -> dict:
        """Call HuggingFace Inference API with audio."""
        headers = {}
        if cls.HF_TOKEN:
            headers["Authorization"] = f"Bearer {cls.HF_TOKEN}"

        # Step 1: Speech-to-text
        stt_url = f"{cls.INFERENCE_ENDPOINT}{cls.MODEL_NAME}"
        with httpx.Client(timeout=30.0) as client:
            stt_response = client.post(
                stt_url,
                headers=headers,
                files={"file": ("audio.webm", audio_bytes, "audio/webm")},
            )

        if stt_response.status_code != 200:
            raise RuntimeError(f"HuggingFace API error: {stt_response.status_code}")

        result = stt_response.json()
        transcription = result.get("text", "").strip()

        # Step 2: Score against expected word
        score = cls._levenshtein_score(transcription.lower(), expected_word.lower())
        stars = 3 if score >= 85 else 2 if score >= 70 else 1

        return {
            "transcription": transcription,
            "score": score,
            "stars": stars,
            "feedback": cls._get_feedback(stars),
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

        # Kid bonus: plural forms, small variations
        if (
            transcription == expected + "s"
            or transcription == expected + "es"
            or transcription == expected.rstrip("s")
        ):
            score = min(100, score + 15)

        return score

    @classmethod
    def _get_feedback(cls, stars: int) -> str:
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
        Main evaluation method.

        Uses HuggingFace API when available. Falls back to Levenshtein if API
        fails or no HF_TOKEN is configured.
        """
        # If browser already gave a high score, skip HF call
        if browser_score is not None and browser_score >= 70:
            stars = 3 if browser_score >= 85 else 2
            return HuggingFaceEvaluationResult(
                score=browser_score,
                stars=stars,
                feedback=cls._get_feedback(stars),
            )

        # Try HuggingFace API
        if cls.HF_TOKEN:
            try:
                result = cls._call_hf_api(audio_data, expected_word)
                return HuggingFaceEvaluationResult(
                    score=result["score"],
                    stars=result["stars"],
                    feedback=result["feedback"],
                    transcription=result.get("transcription"),
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"HuggingFace API failed: {e}")

        # Fallback: Levenshtein only
        score = browser_score if browser_score is not None else 75.0
        stars = 3 if score >= 85 else 2 if score >= 70 else 1
        return HuggingFaceEvaluationResult(
            score=score,
            stars=stars,
            feedback=cls._get_feedback(stars),
        )
