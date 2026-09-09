# backend/services/game_media_upload_service.py
"""
Game vocab media upload service (images + audio) — Supabase Storage.

Follows the exact FlashcardUploadService pattern (httpx PUT with service-role
key, public URL from /storage/v1/object/public/...) but accepts arbitrary
image/audio content types and returns {"url": ...}.
"""
import logging
import uuid
from typing import Optional

import httpx

from settings import settings

logger = logging.getLogger(__name__)

IMAGE_TYPES = ("image/png", "image/jpeg", "image/webp", "image/gif")
AUDIO_TYPES = ("audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm")
ALLOWED_TYPES = IMAGE_TYPES + AUDIO_TYPES

_TYPE_EXT = {
    "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp",
    "image/gif": "gif", "audio/mpeg": "mp3", "audio/mp3": "mp3",
    "audio/wav": "wav", "audio/ogg": "ogg", "audio/webm": "weba",
}


class GameMediaUploadService:
    BUCKET = "learnar-assets"
    FOLDER_IMAGES = "game-vocab/images"
    FOLDER_AUDIO = "game-vocab/audio"
    MAX_BYTES = 10 * 1024 * 1024

    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_SERVICE_ROLE_KEY

    async def upload_media(self, data: bytes, content_type: str,
                           filename: str = "") -> dict:
        """Upload one media file. Returns {"url", "path", "bucket"}.

        Raises ValueError on config/validation problems, Exception on
        storage failure (API layer maps to 4xx/5xx).
        """
        if content_type not in ALLOWED_TYPES:
            raise ValueError(f"UNSUPPORTED_TYPE:{content_type or 'unknown'}")
        if len(data) > self.MAX_BYTES:
            raise ValueError("TOO_LARGE")
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("STORAGE_NOT_CONFIGURED")

        ext = _TYPE_EXT.get(content_type)
        if ext is None:  # trust extension when mimetype is ambiguous
            ext = (filename.rsplit(".", 1)[-1].lower()[:8] or "bin")
        folder = self.FOLDER_AUDIO if content_type.startswith("audio/") else self.FOLDER_IMAGES
        path = f"{folder}/{uuid.uuid4().hex}.{ext}"

        headers = {
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": content_type,
            "x-upsert": "true",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.put(
                f"{self.supabase_url}/storage/v1/object/{self.BUCKET}/{path}",
                content=data,
                headers=headers,
            )
            r.raise_for_status()

        url = f"{self.supabase_url}/storage/v1/object/public/{self.BUCKET}/{path}"
        return {"url": url, "path": path, "bucket": self.BUCKET}
