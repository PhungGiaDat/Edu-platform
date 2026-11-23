"""PostgreSQL repository for flashcard editor canvas state."""
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from database.postgres_connection import postgres_pool


class PostgresFlashcardEditorRepository:
    async def create(
        self,
        flashcard_id: str,
        elements: List[Dict[str, Any]],
        canvas_width: int,
        canvas_height: int,
        qr_position_x: int,
        qr_position_y: int,
        qr_size: int,
        show_qr_in_export: bool,
        created_by: str,
    ) -> Dict[str, Any]:
        row = await postgres_pool().fetchrow(
            """INSERT INTO public.flashcard_editor
               (flashcard_id, elements, canvas_width, canvas_height, qr_position_x, qr_position_y, qr_size, show_qr_in_export, created_by)
               VALUES($1,$2::jsonb,$3,$4,$5,$6,$7,$8,$9) RETURNING *""",
            flashcard_id, json.dumps(elements), canvas_width, canvas_height,
            qr_position_x, qr_position_y, qr_size, show_qr_in_export, created_by,
        )
        return self._row(row)

    async def update(
        self,
        editor_id: int,
        **fields: Any,
    ) -> Dict[str, Any]:
        set_clauses, args = [], []
        for i, (key, value) in enumerate(fields.items(), start=1):
            if key in ("elements",):
                args.append(json.dumps(value))
            else:
                args.append(value)
            set_clauses.append(f"{key}=${i}")
        args.append(editor_id)
        row = await postgres_pool().fetchrow(
            f"UPDATE public.flashcard_editor SET {','.join(set_clauses)},updated_at=now() "
            f"WHERE id=${len(args)} RETURNING *",
            *args,
        )
        return self._row(row) if row else {}

    async def delete(self, editor_id: int) -> bool:
        n = await postgres_pool().execute(
            "DELETE FROM public.flashcard_editor WHERE id=$1", editor_id
        )
        return n > 0

    async def get_by_flashcard_id(self, flashcard_id: str) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.flashcard_editor WHERE flashcard_id=$1", flashcard_id
        )
        return self._row(row) if row else None

    @staticmethod
    def _row(row) -> Dict[str, Any]:
        if row is None:
            return {}
        value = dict(row)
        if isinstance(value.get("elements"), str):
            value["elements"] = json.loads(value["elements"])
        return value


def get_postgres_flashcard_editor_repository() -> PostgresFlashcardEditorRepository:
    return PostgresFlashcardEditorRepository()
