"""PostgreSQL pet catalog repository used by learner endpoints."""
import json
from typing import Optional, Any
from database.postgres_connection import postgres_pool


class PostgresPetRepository:
    @staticmethod
    def _row(row) -> dict[str, Any]:
        value = dict(row)
        for key in ("animations", "unlock_condition"):
            if isinstance(value.get(key), str):
                value[key] = json.loads(value[key])
        return value

    async def list_active(self, category: str | None = None, rarity: str | None = None) -> list[dict[str, Any]]:
        clauses, args = ["is_active=TRUE"], []
        if category:
            args.append(category); clauses.append(f"category=${len(args)}")
        if rarity:
            args.append(rarity); clauses.append(f"rarity=${len(args)}")
        rows = await postgres_pool().fetch("SELECT * FROM public.pets WHERE " + " AND ".join(clauses) + " ORDER BY pet_id", *args)
        return [self._row(row) for row in rows]

    async def get(self, pet_id: str, active_only: bool = True) -> Optional[dict[str, Any]]:
        sql = "SELECT * FROM public.pets WHERE pet_id=$1" + (" AND is_active=TRUE" if active_only else "")
        row = await postgres_pool().fetchrow(sql, pet_id)
        return self._row(row) if row else None
