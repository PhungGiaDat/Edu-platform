# backend/services/flashcard_upload_service.py
"""
Flashcard Image Upload Service
Handles dual PNG export: clean + QR-overlaid.
Storage: Supabase Storage (same bucket as lesson media).
MongoDB: Only image_url (clean PNG) is saved — QR is always rendered client-side.
"""
import logging
from settings import settings
import httpx

logger = logging.getLogger(__name__)


class FlashcardUploadService:
    BUCKET = "learnar-assets"
    FLASHCARDS_FOLDER = "flashcards"

    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_SERVICE_ROLE_KEY

    def _storage_path(self, qr_id: str, suffix: str) -> str:
        """Build Supabase Storage path: flashcards/<qr_id>/<qr_id>[_qr].png"""
        return f"{self.FLASHCARDS_FOLDER}/{qr_id}/{qr_id}{suffix}.png"

    async def upload_dual_images(
        self,
        image_without_qr: bytes,
        image_with_qr: bytes,
        qr_id: str,
    ) -> dict:
        """
        Upload both PNG variants to Supabase Storage.

        Returns:
            {"image_url": "...", "image_with_qr_url": "..."}
            Both URLs are Supabase public URLs.
            image_url → clean PNG (saved to MongoDB)
            image_with_qr_url → QR-overlaid PNG (for print reference, NOT saved to MongoDB)
        """
        clean_path = self._storage_path(qr_id, "")
        qr_path = self._storage_path(qr_id, "_qr")

        image_url = None
        image_with_qr_url = None

        if self.supabase_url and self.supabase_key:
            headers = {
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "image/png",
                "x-upsert": "true",
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                # Upload clean PNG
                try:
                    r = await client.put(
                        f"{self.supabase_url}/storage/v1/object/{self.BUCKET}/{clean_path}",
                        content=image_without_qr,
                        headers=headers,
                    )
                    r.raise_for_status()
                    image_url = (
                        f"{self.supabase_url}/storage/v1/object/public/{self.BUCKET}/{clean_path}"
                    )
                except Exception as e:
                    logger.error(f"[FlashcardUpload] Clean image upload failed: {e}")
                    raise

                # Upload QR-overlaid PNG (non-fatal if it fails)
                try:
                    r = await client.put(
                        f"{self.supabase_url}/storage/v1/object/{self.BUCKET}/{qr_path}",
                        content=image_with_qr,
                        headers=headers,
                    )
                    r.raise_for_status()
                    image_with_qr_url = (
                        f"{self.supabase_url}/storage/v1/object/public/{self.BUCKET}/{qr_path}"
                    )
                except Exception as e:
                    logger.warning(
                        f"[FlashcardUpload] QR image upload failed (non-fatal): {e}"
                    )
                    image_with_qr_url = None
        else:
            # Local fallback — serve from static
            image_url = f"/static/{clean_path}"
            image_with_qr_url = f"/static/{qr_path}"

        return {
            "image_url": image_url,
            "image_with_qr_url": image_with_qr_url,
        }


def get_flashcard_upload_service() -> FlashcardUploadService:
    return FlashcardUploadService()
