"""Database-first mapping of the existing ``mini_game_items`` table."""
from typing import Any, Optional
from sqlalchemy import BigInteger, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from database.orm_base import Base

class MiniGameItemORM(Base):
    __tablename__ = "mini_game_items"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    game_type: Mapped[str] = mapped_column(Text)
    flashcard_qr_id: Mapped[Optional[str]] = mapped_column(ForeignKey("flashcards.qr_id", ondelete="SET NULL", name="mini_game_items_flashcard_qr_id_fkey"))
    difficulty: Mapped[Optional[str]] = mapped_column(Text)
    question: Mapped[Optional[str]] = mapped_column(Text)
    image_url: Mapped[Optional[str]] = mapped_column(Text)
    correct_answer: Mapped[Optional[str]] = mapped_column(Text)
    stars_reward: Mapped[Optional[int]] = mapped_column(Integer)
    time_limit: Mapped[Optional[int]] = mapped_column(Integer)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
