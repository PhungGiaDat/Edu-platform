"""Database-first mappings for the existing canonical quiz tables."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import BigInteger, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.orm_base import Base


class QuizQuestionORM(Base):
    __tablename__ = "quiz_questions"
    __table_args__ = (UniqueConstraint("flashcard_qr_id", "question_id", name="quiz_questions_flashcard_qr_id_question_id_key"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    flashcard_qr_id: Mapped[str] = mapped_column(ForeignKey("flashcards.qr_id", ondelete="RESTRICT", name="quiz_questions_flashcard_qr_id_fkey"))
    question_id: Mapped[str] = mapped_column(Text)
    question_text: Mapped[str] = mapped_column(Text)
    question_type: Mapped[str] = mapped_column(Text)
    correct_answer: Mapped[Optional[str]] = mapped_column(Text)
    explanation: Mapped[Optional[str]] = mapped_column(Text)
    time_limit: Mapped[Optional[int]] = mapped_column(Integer)
    passing_score: Mapped[Optional[int]] = mapped_column(Integer)
    options: Mapped[list["QuizQuestionOptionORM"]] = relationship(back_populates="question", lazy="selectin")


class QuizQuestionOptionORM(Base):
    __tablename__ = "quiz_question_options"

    question_id: Mapped[int] = mapped_column(ForeignKey("quiz_questions.id", ondelete="RESTRICT", name="quiz_question_options_question_id_fkey"), primary_key=True)
    option_order: Mapped[int] = mapped_column(Integer, primary_key=True)
    value: Mapped[str] = mapped_column(Text)
    question: Mapped[QuizQuestionORM] = relationship(back_populates="options")
