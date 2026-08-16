"""LC4 configured Course Game hydration and session completion."""
from typing import Any
from models.asset_contract import AssetRole
from models.game_activity import MemoryMatchPayload
from models.lesson_activity import MiniGameActivity, normalize_learning_blocks
from repositories.orm_course_repository import CourseRepository
from repositories.orm_mini_game_repository import MiniGameRepository
from services.learner_asset_service import LearnerAssetService

class MiniGameActivityService:
    def __init__(self, courses: CourseRepository, games: MiniGameRepository, assets: LearnerAssetService | None = None): self.courses, self.games, self.assets = courses, games, assets
    async def _activity(self, course_id: str, lesson_id: str, activity_id: str) -> MiniGameActivity:
        lesson = await self.courses.get_lesson(course_id, lesson_id)
        activity = next((a for a in normalize_learning_blocks(lesson.get('learning_blocks') if lesson else {}).activities if a.activity_id == activity_id), None)
        if not isinstance(activity, MiniGameActivity): raise ValueError('Mini-game activity not found')
        if activity.config.game_type != 'memory_match': raise ValueError(f'Unsupported LC4 game type: {activity.config.game_type}')
        return activity
    async def hydrate(self, user_id: str, course_id: str, lesson_id: str, activity_id: str) -> dict[str, Any]:
        activity = await self._activity(course_id, lesson_id, activity_id)
        session = await self.courses.get_lesson_session(user_id, course_id, lesson_id)
        if not any(step['step_id'] == activity_id for step in session['steps']): raise ValueError('Mini-game activity is not mapped to this lesson session')
        items = await self.games.get_items(activity.config.mini_game_item_ids, 'memory_match')
        cards = []
        for item in items:
            payload = MemoryMatchPayload.model_validate(item.payload or {})
            for index, card in enumerate(payload.pairs):
                asset = None
                if card.type == 'image' and card.vocabulary_id and card.asset_role:
                    if self.assets is None: raise RuntimeError('Learner asset persistence requires the request-scoped ORM session')
                    asset = await self.assets.resolve_vocabulary_asset(course_id, lesson_id, card.vocabulary_id, AssetRole(card.asset_role))
                cards.append({'card_id': f'{item.id}:{index}', 'pair_id': str(item.id), 'type': card.type, 'content': card.content, 'asset': asset})
        return {'activity_id': activity_id, 'game_type': 'memory_match', 'cards': cards}
    async def complete(self, user_id: str, course_id: str, lesson_id: str, activity_id: str, matched_pair_ids: list[str]) -> dict[str, Any]:
        hydrated = await self.hydrate(user_id, course_id, lesson_id, activity_id)
        expected = sorted({card['pair_id'] for card in hydrated['cards']})
        if sorted(set(matched_pair_ids)) != expected: raise ValueError('Matched pairs do not complete this game')
        session = await self.courses.get_lesson_session(user_id, course_id, lesson_id)
        if session.get('current_step_id') != activity_id: raise ValueError('Mini-game activity is not currently available')
        from services.course_service import _advance_session
        session = _advance_session(session, activity_id, True, 100, {'matched_pair_ids': expected, 'game_type': 'memory_match'})
        await self.courses.upsert_lesson_session(session)
        await self.courses.create_lesson_step_attempt({'session_id': session['session_id'], 'user_id': user_id, 'course_id': course_id, 'lesson_id': lesson_id, 'step_id': activity_id, 'attempt_type': 'mini_game', 'passed': True, 'score': 100, 'response_data': {'matched_pair_ids': expected}})
        return {'completed': True, 'session': session}
