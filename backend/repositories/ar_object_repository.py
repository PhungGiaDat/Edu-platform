"""PostgreSQL repository for semantic AR objects and tracking targets."""
from typing import Optional, List, Dict, Any
import json

from database.postgres_connection import postgres_pool


class ARObjectRepository:
    async def get_by_tag(self, ar_tag: str) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.ar_objects WHERE ar_tag=$1", ar_tag
        )
        return dict(row) if row else None

    async def get_tracking_target(self, qr_id: str) -> Optional[Dict[str, Any]]:
        row = await postgres_pool().fetchrow(
            "SELECT * FROM public.ar_tracking_targets WHERE qr_id=$1", qr_id
        )
        return dict(row) if row else None

    async def get_by_marker_type(self, marker_type: str) -> List[Dict[str, Any]]:
        return []

    async def get_all_tags(self) -> List[str]:
        return [
            row["ar_tag"]
            for row in await postgres_pool().fetch(
                "SELECT ar_tag FROM public.ar_objects ORDER BY ar_tag"
            )
        ]


def get_ar_object_repository() -> ARObjectRepository:
    return ARObjectRepository()
