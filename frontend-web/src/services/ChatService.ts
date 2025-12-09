// services/ChatService.ts
/**
 * Chat Service - Handles AI chat API calls including RAG
 */
import axios from 'axios';
import { getApiBase } from '../config';

const API_URL = `${getApiBase()}/api`;

// ========== Types ==========
export interface ChatResponse {
    response: string;
}

export interface RAGChatResponse {
    response: string;
    sources: { word: string; score: number }[];
    session_id: string;
}

export interface PronunciationResult {
    feedback: string;
}

// ========== Session Management ==========
let currentSessionId: string | null = null;

export const ChatService = {
    /**
     * Get or create session ID for conversation tracking
     */
    getSessionId(): string {
        if (!currentSessionId) {
            currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        return currentSessionId;
    },

    /**
     * Reset session (start new conversation)
     */
    resetSession(): void {
        currentSessionId = null;
    },

    /**
     * Send message using RAG-enabled endpoint (new)
     * Uses vector search to find relevant flashcards for context
     */
    async sendRAGMessage(question: string, userId?: string): Promise<RAGChatResponse> {
        try {
            const response = await axios.post(`${API_URL}/chat/rag`, {
                question,
                session_id: this.getSessionId(),
                user_id: userId || null
            });

            // Update session ID from response
            if (response.data.session_id) {
                currentSessionId = response.data.session_id;
            }

            return response.data;
        } catch (error) {
            console.error('[ChatService] RAG request failed:', error);
            // Fallback response
            return {
                response: "Xin lỗi, mình gặp lỗi rồi. Bạn thử lại nhé! 🙏",
                sources: [],
                session_id: this.getSessionId()
            };
        }
    },

    /**
     * Send message using legacy endpoint (backward compatibility)
     */
    async sendMessage(message: string, context: string = ""): Promise<string> {
        const response = await axios.post(`${API_URL}/chat/message`, {
            message,
            context
        });
        return response.data.response;
    },

    /**
     * Analyze pronunciation
     */
    async analyzePronunciation(targetText: string, audioText: string): Promise<PronunciationResult> {
        const response = await axios.post(`${API_URL}/chat/pronunciation`, {
            target_text: targetText,
            audio_text: audioText
        });
        return response.data;
    },

    /**
     * Test embedding generation (debug)
     */
    async testEmbedding(text: string): Promise<{ status: string; embedding_length: number }> {
        const response = await axios.post(`${API_URL}/chat/test-embedding`, {
            text
        });
        return response.data;
    }
};

