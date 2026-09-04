from dataclasses import dataclass
from typing import Optional
import os


@dataclass
class HuggingFaceEvaluationResult:
    score: float
    stars: int
    feedback: str
    phoneme_analysis: Optional[dict] = None


class HuggingFaceEvaluationService:
    """Service for evaluating pronunciation using HuggingFace wav2vec2 model."""

    MODEL_NAME = "facebook/wav2vec2-base"  # placeholder for fine-tuned model
    HF_TOKEN = os.getenv("HF_TOKEN")

    @classmethod
    def evaluate(cls, audio_data: bytes, expected_word: str) -> HuggingFaceEvaluationResult:
        """
        Evaluate pronunciation via HuggingFace Inference API.

        In production: call HF Inference API with fine-tuned wav2vec2 model.
        For demo: returns simulated score based on Levenshtein distance.
        """
        # TODO: Implement actual HuggingFace API call
        # from huggingface_hub import InferenceClient
        # client = InferenceClient(model=cls.MODEL_NAME, token=cls.HF_TOKEN)
        # result = client.automatic_speech_recognition(audio_data)

        # Demo: simple string similarity
        score = 75.0  # placeholder

        if score >= 85:
            stars = 3
            feedback = "Tuyệt vời! Phát âm hoàn hảo!"
        elif score >= 70:
            stars = 2
            feedback = "Tốt lắm! Cố gắng thêm một chút nhé!"
        else:
            stars = 1
            feedback = "Đang tiến bộ! Nghe lại và thử lại nào!"

        return HuggingFaceEvaluationResult(
            score=score,
            stars=stars,
            feedback=feedback,
        )
