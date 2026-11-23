// frontend-web/src/services/flashcardEditorApi.ts
/**
 * Flashcard Editor API Service
 * Handles canvas editor state persistence
 */
import { apiClient } from './apiClient';
import type { CanvasElement } from '../stores/flashcard-editor.store';

interface FlashcardEditorData {
  flashcard_id: string;
  elements: CanvasElement[];
  canvas_width: number;
  canvas_height: number;
  qr_position_x: number;
  qr_position_y: number;
  qr_size: number;
  show_qr_in_export: boolean;
}

interface FlashcardEditorResponse {
  id: string;
  flashcard_id: string;
  elements: CanvasElement[];
  canvas_width: number;
  canvas_height: number;
  qr_position_x: number;
  qr_position_y: number;
  qr_size: number;
  show_qr_in_export: boolean;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

interface SaveResponse {
  success: boolean;
  message: string;
  editor_id?: string;
  updated_at?: string;
}

const EDITOR_API_BASE = '/api/v1/flashcard-editor';

/**
 * Flashcard Editor API
 */
export const flashcardEditorApi = {
  /**
   * Save flashcard editor state
   */
  async save(data: FlashcardEditorData): Promise<SaveResponse> {
    try {
      const response = await apiClient.post(`${EDITOR_API_BASE}/save`, data);
      return response as SaveResponse;
    } catch (error) {
      console.error('[flashcardEditorApi.save] Error:', error);
      throw error;
    }
  },

  /**
   * Get flashcard editor state by flashcard ID
   */
  async get(flashcardId: string): Promise<FlashcardEditorResponse> {
    try {
      const response = await apiClient.get(`${EDITOR_API_BASE}/${flashcardId}`);
      return response as FlashcardEditorResponse;
    } catch (error) {
      console.error('[flashcardEditorApi.get] Error:', error);
      throw error;
    }
  },

  /**
   * Update flashcard editor state
   */
  async update(flashcardId: string, data: Partial<FlashcardEditorData>): Promise<FlashcardEditorResponse> {
    try {
      const response = await apiClient.put(`${EDITOR_API_BASE}/${flashcardId}`, data);
      return response as FlashcardEditorResponse;
    } catch (error) {
      console.error('[flashcardEditorApi.update] Error:', error);
      throw error;
    }
  },

  /**
   * Delete flashcard editor state
   */
  async delete(flashcardId: string): Promise<void> {
    try {
      await apiClient.delete(`${EDITOR_API_BASE}/${flashcardId}`);
    } catch (error) {
      console.error('[flashcardEditorApi.delete] Error:', error);
      throw error;
    }
  },
};

export default flashcardEditorApi;
