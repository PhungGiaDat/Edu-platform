"""Learner-facing data contract for a hydrated LC3 quiz activity."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class QuizActivityOption(BaseModel):
    option_id: str
    label: str
    order: int


class QuizActivityQuestion(BaseModel):
    question_id: int
    question_type: Literal["multiple_choice", "true_false"]
    prompt: str
    options: list[QuizActivityOption] = Field(min_length=1)
    flashcard_qr_id: str


class QuizActivityHydration(BaseModel):
    activity_id: str
    questions: list[QuizActivityQuestion]


class QuizActivityAnswerRequest(BaseModel):
    question_id: int
    option_id: str


class QuizActivityAnswerResult(BaseModel):
    question_id: int
    correct: bool
    score: int
    completed: bool
    session: dict
