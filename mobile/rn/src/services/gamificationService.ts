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
} from '../types/gamification';

export const gamificationService = {
  getProfile: () => api.get<GamificationProfile>('/gamification/me'),

  listBadges: () => api.get<Badge[]>('/gamification/badges'),

  awardXp: (body: AwardXpRequest) =>
    api.post<AwardXpResponse>('/gamification/xp', body),
};

export default gamificationService;
