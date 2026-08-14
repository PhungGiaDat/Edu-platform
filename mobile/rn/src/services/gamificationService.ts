/**
 * gamificationService — XP, streaks, badges, levels.
 * RN-compatible; no AR coupling.
 */
import api from './api';
import type {
  AwardXpRequest,
  AwardXpResponse,
  Badge,
  GamificationProfile,
  AddXpEventRequest,
  AddXpEventResponse,
  toAddXpEventWireRequest,
} from '../types/gamification';

export const gamificationService = {
  getProfile: () => api.get<GamificationProfile>('/gamification/me'),

  listBadges: () => api.get<Badge[]>('/gamification/badges'),

  awardXp: (body: AwardXpRequest) =>
    api.post<AwardXpResponse>('/gamification/xp', body),

  /**
   * Idempotent XP event for C26 gamification.
   * Uses POST /gamification/xp-event with stable eventId.
   *
   * IMPORTANT: eventId must be:
   * - Stable: Same semantic occurrence = same eventId
   * - Unique: Different occurrences = different eventIds
   * - Generated ONCE at semantic event creation, not inside retry loops
   */
  addXpEvent: (body: AddXpEventRequest) =>
    api.post<AddXpEventResponse>('/gamification/xp-event', toAddXpEventWireRequest(body)),
};

export default gamificationService;
