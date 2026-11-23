"""AsyncSession access to configured canonical mini-game rows."""
from collections.abc import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database.orm_models.game import MiniGameItemORM

class MiniGameRepository:
    def __init__(self, session: AsyncSession): self.session = session
    async def get_items(self, item_ids: Sequence[int], game_type: str) -> list[MiniGameItemORM]:
        if not item_ids: return []
        rows = (await self.session.execute(select(MiniGameItemORM).where(MiniGameItemORM.id.in_(item_ids), MiniGameItemORM.game_type == game_type))).scalars().all()
        by_id = {row.id: row for row in rows}
        missing = [item_id for item_id in item_ids if item_id not in by_id]
        if missing: raise ValueError(f"Unknown or wrong-type mini-game item IDs: {missing}")
        return [by_id[item_id] for item_id in item_ids]
