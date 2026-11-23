/**
 * Notebook API Client
 * Frontend service for Notebook (Sổ tay) endpoints
 */
import { request } from './apiClient';
import type { NotebookEntry, CreateEntryRequest, UpdateEntryRequest } from '../types/notebook';

export interface NotebookListResponse {
  items: NotebookEntry[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface DueCardsResponse {
  items: NotebookEntry[];
  count: number;
}

export interface ReviewResult {
  entry_id: string;
  quality: number;
  new_ease_factor: number;
  new_interval_days: number;
  next_review_at: string;
  review_count: number;
  // Kid progress (additive)
  mastery_box: number;
  box_up: boolean;
  // Reward processing (backend-authoritative, idempotent via event_id)
  xp_awarded?: number | null;
  total_xp?: number | null;
  level?: number | null;
  level_up?: boolean | null;
  sticker_earned?: { id: string; name: string; rarity: string } | null;
}

export const notebookApi = {
  /**
   * Get all notebook entries for current user
   */
  async list(params?: {
    topic?: string;
    difficulty?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<NotebookListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.topic) searchParams.set('topic', params.topic);
    if (params?.difficulty) searchParams.set('difficulty', params.difficulty);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.per_page) searchParams.set('per_page', String(params.per_page));

    const query = searchParams.toString();
    return request(`/api/v1/notebook${query ? `?${query}` : ''}`, { method: 'GET' }) as Promise<NotebookListResponse>;
  },

  /**
   * Get cards due for review
   */
  async getDueCards(limit = 20): Promise<DueCardsResponse> {
    return request(`/api/v1/notebook/due?limit=${limit}`, { method: 'GET' }) as Promise<DueCardsResponse>;
  },

  /**
   * Get a single notebook entry
   */
  async get(id: string): Promise<NotebookEntry> {
    return request(`/api/v1/notebook/${id}`, { method: 'GET' }) as Promise<NotebookEntry>;
  },

  /**
   * Create a new notebook entry
   */
  async create(data: CreateEntryRequest): Promise<NotebookEntry> {
    return request('/api/v1/notebook', {
      method: 'POST',
      body: data,
    }) as Promise<NotebookEntry>;
  },

  /**
   * Update a notebook entry
   */
  async update(id: string, data: UpdateEntryRequest): Promise<NotebookEntry> {
    return request(`/api/v1/notebook/${id}`, {
      method: 'PUT',
      body: data,
    }) as Promise<NotebookEntry>;
  },

  /**
   * Delete a notebook entry
   */
  async delete(id: string): Promise<void> {
    return request(`/api/v1/notebook/${id}`, { method: 'DELETE' }) as Promise<void>;
  },

  /**
   * Submit a review result (kid SM-2, no-fail box ladder).
   * eventId: stable per-swipe id — same id on retry never double-awards XP.
   */
  async submitReview(id: string, quality: number, eventId?: string): Promise<ReviewResult> {
    return request('/api/v1/notebook/review', {
      method: 'POST',
      body: { entry_id: id, quality, event_id: eventId },
    }) as Promise<ReviewResult>;
  },
};
