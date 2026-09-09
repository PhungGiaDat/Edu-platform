// frontend/src/services/gamesAdminApi.ts
/**
 * Admin Games Management API (2026-09-09 activation â€” approved spec Â§3.2)
 *
 * Mirrors adminApi.ts conventions (apiClient + '/api/v1/admin' base).
 * Endpoints:
 *   GET|POST   /admin/games                list / create
 *   GET|PUT|DELETE /admin/games/{id}       detail / update / delete
 *   GET|POST   /admin/games/topics         list / create topics
 *   PUT        /admin/games/topics/{id}    update topic
 *   GET|POST   /admin/games/topics/{id}/vocab
 *   PUT|DELETE /admin/games/vocab/{itemId}
 *   POST       /admin/games/upload-media   base64 media â†’ Supabase
 */
import { apiClient } from './apiClient';

const ADMIN_BASE_URL = '/api/v1/admin';

export type AdminGameType = 'drag_match' | 'catch_word' | 'word_scramble' | 'memory_match';

export interface AdminGameTopic {
  id: string;
  slug: string;
  name: string;
  name_vi: string;
  description?: string | null;
  cover_image_url?: string | null;
  is_published: boolean;
  sort_order: number;
}

export interface AdminVocabItem {
  id: string;
  topic_id: string;
  word: string;
  translation_vi: string;
  image_url?: string | null;
  audio_url?: string | null;
  sort_order: number;
}

export interface AdminGame {
  id: string;
  slug: string;
  title: string;
  title_vi: string;
  game_type: AdminGameType;
  topic_id: string;
  config: Record<string, number>;
  is_published: boolean;
  teacher_id?: string | null;
}

export interface GameConfigDraft {
  pair_count?: number;
  timer_seconds?: number;
  fall_speed?: number;
  spawn_interval?: number;
  word_count?: number;
  hint_letters?: number;
  flip_duration_ms?: number;
}

const topicsUrl = `${ADMIN_BASE_URL}/games/topics`;
const gamesUrl = `${ADMIN_BASE_URL}/games`;

export const adminGamesApi = {
  // ------------------------------------------------------------- Games ----
  async listGames(): Promise<AdminGame[]> {
    return apiClient.get(`${gamesUrl}`);
  },

  async getGame(gameId: string): Promise<AdminGame> {
    return apiClient.get(`${gamesUrl}/${gameId}`);
  },

  async createGame(payload: {
    title: string;
    title_vi?: string;
    game_type: AdminGameType;
    topic_id: string;
    config: GameConfigDraft;
    is_published: boolean;
  }): Promise<AdminGame> {
    return apiClient.post(`${gamesUrl}`, payload);
  },

  async updateGame(gameId: string, payload: Partial<{
    title: string;
    title_vi: string;
    game_type: AdminGameType;
    topic_id: string;
    config: GameConfigDraft;
    is_published: boolean;
  }>): Promise<AdminGame> {
    return apiClient.put(`${gamesUrl}/${gameId}`, payload);
  },

  async deleteGame(gameId: string): Promise<void> {
    await apiClient.delete(`${gamesUrl}/${gameId}`);
  },

  // ------------------------------------------------------------ Topics ----
  async listTopics(): Promise<AdminGameTopic[]> {
    return apiClient.get(`${topicsUrl}`);
  },

  async createTopic(payload: { name: string; name_vi?: string; is_published?: boolean }): Promise<AdminGameTopic> {
    return apiClient.post(`${topicsUrl}`, payload);
  },

  async updateTopic(topicId: string, payload: Partial<{ name: string; name_vi: string; is_published: boolean; sort_order: number }>): Promise<AdminGameTopic> {
    return apiClient.put(`${topicsUrl}/${topicId}`, payload);
  },

  // ------------------------------------------------------------- Vocab ----
  async listVocab(topicId: string): Promise<AdminVocabItem[]> {
    return apiClient.get(`${topicsUrl}/${topicId}/vocab`);
  },

  async addVocab(topicId: string, payload: {
    word: string;
    translation_vi: string;
    image_url?: string | null;
    audio_url?: string | null;
  }): Promise<AdminVocabItem> {
    return apiClient.post(`${topicsUrl}/${topicId}/vocab`, payload);
  },

  async updateVocab(itemId: string, payload: Partial<{
    word: string;
    translation_vi: string;
    image_url: string | null;
    audio_url: string | null;
  }>): Promise<AdminVocabItem> {
    return apiClient.put(`${ADMIN_BASE_URL}/games/vocab/${itemId}`, payload);
  },

  async deleteVocab(itemId: string): Promise<void> {
    await apiClient.delete(`${ADMIN_BASE_URL}/games/vocab/${itemId}`);
  },

  // ------------------------------------------------------------- Upload ----
  /**
   * Upload media (image/audio) via base64 â€” mirrors uploadFlashcardImage
   * contract (JSON body, base64 data). Returns the Supabase public URL.
   */
  async uploadMedia(file: File): Promise<string> {
    const dataB64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = () => reject(new Error('KhÃ´ng Ä‘á»c Ä‘Æ°á»£c tá»‡p'));
      reader.readAsDataURL(file);
    });

    const response = await apiClient.post(
      `${gamesUrl}/upload-media`,
      { data_b64: dataB64, content_type: file.type || 'image/png', filename: file.name },
    );
    return response.url;
  },
};

