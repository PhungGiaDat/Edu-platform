"""Small LC5 resolver between canonical media rows and learner DTOs."""

from __future__ import annotations

from models.asset_contract import AssetRole, ResolvedLearnerAsset, vocabulary_asset_key
from models.lesson_media import MediaType
from repositories.orm_media_asset_repository import MediaAssetRepository


class LearnerAssetService:
    def __init__(self, media: MediaAssetRepository):
        self.media = media

    async def resolve_vocabulary_asset(self, course_id: str, lesson_id: str, vocabulary_id: str, role: AssetRole) -> ResolvedLearnerAsset:
        asset = await self.media.get_ready_asset(
            course_id, lesson_id, "vocabulary", vocabulary_asset_key(vocabulary_id, role)
        )
        if asset is None or not asset.public_url:
            raise ValueError(f"Missing ready {role.value} for vocabulary {vocabulary_id}")
        return ResolvedLearnerAsset(
            role=role,
            url=asset.public_url,
            media_type=MediaType(asset.type),
            metadata=asset.metadata_ or {},
        )

    async def resolve_course_asset(self, course_id: str, role: AssetRole) -> ResolvedLearnerAsset:
        if role is not AssetRole.COURSE_COVER:
            raise ValueError(f"{role.value} is not a Course asset role")
        public_url = await self.media.get_course_cover_url(course_id)
        if not public_url:
            raise ValueError(f"Missing ready course_cover for Course {course_id}")
        return ResolvedLearnerAsset(
            role=role,
            url=public_url,
            media_type=MediaType.IMAGE,
            metadata={},
        )
