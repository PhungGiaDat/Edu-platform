# backend/services/lesson_media_service.py
"""
Lesson Media Service - Business logic for lesson media management
"""
import logging
from typing import Optional, List, Dict, Any
from settings import settings
import httpx

logger = logging.getLogger(__name__)


class LessonMediaService:
    """
    Service for managing lesson media assets.
    Integrates with Supabase Storage for file uploads.
    """

    def __init__(self):
        self.bucket = settings.LEARNAR_ASSETS_BUCKET
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_SERVICE_ROLE_KEY

    async def upload_media(
        self,
        file_content: bytes,
        filename: str,
        content_type: str,
        lesson_id: str,
        course_id: str,
        section_id: Optional[str],
        media_type: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Upload media to Supabase Storage.

        Args:
            file_content: File bytes
            filename: Original filename
            content_type: MIME type
            lesson_id: Associated lesson ID
            course_id: Associated course ID
            section_id: Associated section ID
            media_type: Type of media (video, image, audio)
            metadata: Additional metadata

        Returns:
            Asset record with URL
        """
        import uuid
        from datetime import datetime

        asset_id = str(uuid.uuid4())
        file_ext = filename.rsplit(".", 1)[-1] if "." in filename else ""
        storage_path = f"{course_id}/{lesson_id}/{section_id or 'root'}/{asset_id}.{file_ext}"

        public_url = None

        if self.supabase_url and self.supabase_key:
            try:
                public_url = await self._upload_to_supabase(
                    file_content=file_content,
                    path=storage_path,
                    content_type=content_type
                )
            except Exception as e:
                logger.error(f"[MediaService] Supabase upload failed: {e}")
                raise
        else:
            public_url = f"/assets/{storage_path}"

        asset_record = {
            "asset_id": asset_id,
            "course_id": course_id,
            "lesson_id": lesson_id,
            "section_id": section_id,
            "asset_key": filename,
            "bucket": self.bucket,
            "path": storage_path,
            "type": media_type,
            "status": "ready",
            "public_url": public_url,
            "provider": "supabase" if self.supabase_url else "local",
            "metadata": metadata or {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        return asset_record

    async def _upload_to_supabase(
        self,
        file_content: bytes,
        path: str,
        content_type: str
    ) -> str:
        """Upload file to Supabase Storage and return public URL."""
        upload_url = f"{self.supabase_url}/storage/v1/object/{self.bucket}/{path}"

        headers = {
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": content_type,
            "x-upsert": "true",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                upload_url,
                headers=headers,
                content=file_content
            )

            if response.status_code not in (200, 201):
                raise Exception(f"Supabase upload failed: {response.status_code} - {response.text}")

        return f"{self.supabase_url}/storage/v1/object/public/{self.bucket}/{path}"

    async def delete_media(self, asset_id: str, path: str) -> bool:
        """Delete media from storage."""
        if self.supabase_url and self.supabase_key:
            try:
                delete_url = f"{self.supabase_url}/storage/v1/object/{self.bucket}/{path}"
                headers = {
                    "Authorization": f"Bearer {self.supabase_key}",
                }

                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.delete(delete_url, headers=headers)

                    if response.status_code not in (200, 204):
                        logger.warning(f"[MediaService] Delete failed: {response.status_code}")
                        return False

                return True
            except Exception as e:
                logger.error(f"[MediaService] Delete error: {e}")
                return False

        return True

    async def get_media_url(self, path: str) -> Optional[str]:
        """Get public URL for a media asset."""
        if path.startswith("http"):
            return path

        if self.supabase_url:
            return f"{self.supabase_url}/storage/v1/object/public/{self.bucket}/{path}"

        return f"/assets/{path}"


def get_lesson_media_service() -> LessonMediaService:
    """Factory function for dependency injection."""
    return LessonMediaService()
