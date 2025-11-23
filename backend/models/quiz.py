# backend/service/quiz/schemas/models.py

from pydantic import BaseModel, Field
from typing import List, Literal

class QuizQuestion(BaseModel):
    id: str
    type: Literal["multiple_choice", "true_false"]
    question_text: str
    image_url: str | None = None
    options: List[str]
    correct_answer: str
    explanation: str | None = None

class QuizSessionSchema(BaseModel):
    flashcard_qr_id: str
    questions: List[QuizQuestion]
    time_limit: int | None = Field(None, description="Time limit in seconds")
    passing_score: int | None = Field(None, description="Minimum correct answers to pass")