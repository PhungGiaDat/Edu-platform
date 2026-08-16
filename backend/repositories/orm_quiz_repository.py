"""AsyncSession-backed access to canonical quiz questions and options."""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database.orm_models.quiz import QuizQuestionORM


class QuizRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_questions(self, question_ids: Sequence[int]) -> list[QuizQuestionORM]:
        if not question_ids:
            return []
        result = await self.session.execute(
            select(QuizQuestionORM)
            .options(selectinload(QuizQuestionORM.options))
            .where(QuizQuestionORM.id.in_(question_ids))
        )
        by_id = {question.id: question for question in result.scalars().unique()}
        missing = [question_id for question_id in question_ids if question_id not in by_id]
        if missing:
            raise ValueError(f"Unknown quiz question IDs: {missing}")
        return [by_id[question_id] for question_id in question_ids]
