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

    async def get_tracking_targets_with_xr(
        self, deck_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get tracking targets with XR target URLs and ar_objects data for 8th Wall engine.

        Joins ar_tracking_targets (XR URLs) with ar_objects (animations, model, transforms).
        This allows the frontend to get all data without hardcoding animations.

        Returns:
            List of dicts with:
            - qr_id, word (from flashcard)
            - xr_target_json_url, xr_target_image_url (from ar_tracking_targets)
            - animations[], default_animation, combo_animation (from ar_objects)
            - model_3d_url, texture_url, position, rotation, scale (from ar_objects)
        """
        if deck_id:
            query = """
                SELECT
                    tt.qr_id,
                    f.word,
                    tt.xr_target_json_url,
                    tt.xr_target_image_url,
                    tt.reference_image_url,
                    tt.animation_type,
                    tt.mind_catalog_id,
                    tt.mind_target_index,
                    fd.name as deck_name,
                    fd.category as deck_category,
                    fd.deck_id,
                    COALESCE(ao.description, tt.qr_id || ' AR object') as description,
                    ao.animations,
                    ao.default_animation,
                    ao.combo_animation,
                    COALESCE(ao.model_3d_url, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb') as model_3d_url,
                    ao.texture_url,
                    COALESCE(ao.position, '0 0 0') as position,
                    COALESCE(ao.rotation, '0 0 0') as rotation,
                    COALESCE(ao.scale, '1 1 1') as scale
                FROM public.ar_tracking_targets tt
                JOIN public.flashcards f ON tt.qr_id = f.qr_id
                JOIN public.flashcard_decks fd ON f.deck_id = fd.deck_id
                LEFT JOIN public.ar_objects ao ON ao.ar_tag = tt.qr_id
                WHERE f.deck_id = $1
                ORDER BY f.qr_id
            """
            rows = await postgres_pool().fetch(query, deck_id)
        else:
            query = """
                SELECT
                    tt.qr_id,
                    f.word,
                    tt.xr_target_json_url,
                    tt.xr_target_image_url,
                    tt.reference_image_url,
                    tt.animation_type,
                    tt.mind_catalog_id,
                    tt.mind_target_index,
                    fd.name as deck_name,
                    fd.category as deck_category,
                    fd.deck_id,
                    COALESCE(ao.description, tt.qr_id || ' AR object') as description,
                    ao.animations,
                    ao.default_animation,
                    ao.combo_animation,
                    COALESCE(ao.model_3d_url, 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/3dmodel/ragdollcat_mobile.glb') as model_3d_url,
                    ao.texture_url,
                    COALESCE(ao.position, '0 0 0') as position,
                    COALESCE(ao.rotation, '0 0 0') as rotation,
                    COALESCE(ao.scale, '1 1 1') as scale
                FROM public.ar_tracking_targets tt
                JOIN public.flashcards f ON tt.qr_id = f.qr_id
                JOIN public.flashcard_decks fd ON f.deck_id = fd.deck_id
                LEFT JOIN public.ar_objects ao ON ao.ar_tag = tt.qr_id
                WHERE tt.xr_target_json_url IS NOT NULL
                ORDER BY f.qr_id
            """
            rows = await postgres_pool().fetch(query)
        return [dict(row) for row in rows]

    async def get_xr_target_urls(self, qr_ids: List[str]) -> Dict[str, Dict[str, str]]:
        """Get XR target URLs for multiple qr_ids. Returns dict mapping qr_id to urls."""
        if not qr_ids:
            return {}
        query = """
            SELECT qr_id, xr_target_json_url, xr_target_image_url, reference_image_url
            FROM public.ar_tracking_targets
            WHERE qr_id = ANY($1)
        """
        rows = await postgres_pool().fetch(query, qr_ids)
        return {row["qr_id"]: dict(row) for row in rows}

    async def get_by_marker_type(self, marker_type: str) -> List[Dict[str, Any]]:
        return []

    async def get_all_tags(self) -> List[str]:
        return [
            row["ar_tag"]
            for row in await postgres_pool().fetch(
                "SELECT ar_tag FROM public.ar_objects ORDER BY ar_tag"
            )
        ]

    async def get_all(self) -> List[Dict[str, Any]]:
        rows = await postgres_pool().fetch("SELECT * FROM public.ar_objects ORDER BY ar_tag")
        return [dict(row) for row in rows]

    async def update_nft_base_url(self, ar_tag: str, nft_base_url: str) -> bool:
        result = await postgres_pool().execute(
            "UPDATE public.ar_objects SET nft_base_url=$1 WHERE ar_tag=$2", nft_base_url, ar_tag
        )
        return result == "UPDATE 1"


def get_ar_object_repository() -> ARObjectRepository:
    return ARObjectRepository()
