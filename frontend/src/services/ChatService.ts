// services/ChatService.ts
/**
 * Chat Service - Handles AI chat API calls including RAG
 */
import { apiClient } from './apiClient';

// ========== Types ==========
export interface ChatResponse {
    response: string;
}

export interface RAGChatResponse {
    response: string;
    sources: { word: string; score: number }[];
    session_id: string;
    agent_trace?: string[];
    /** True when the backend rejected an anonymous call (HTTP 401). */
    requires_login?: boolean;
}

export interface PronunciationResult {
    feedback: string;
}

// ── Model catalog ────────────────────────────────────────────────────────────────

export interface ModelInfo {
    id: string;
    role: 'planner' | 'generator' | 'validator';
    description: string;
}

export interface ChatModelsResponse {
    models: ModelInfo[];
    defaults: Record<string, string>;
}

// ── Session Management ────────────────────────────────────────────────────────
let currentSessionId: string | null = null;

export const ChatService = {
    /**
     * Get available TokenRouter models from backend.
     */
    async getModels(): Promise<ChatModelsResponse> {
        return apiClient.get('/api/v1/chat/models');
    },

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
     * Send message using RAG-enabled endpoint.
     * Optional per-stage model overrides route each agent to a different model.
     */
    async sendRAGMessage(
        question: string,
        userId?: string,
        modelOverrides?: {
            planner_model?: string;
            generator_model?: string;
            validator_model?: string;
        },
    ): Promise<RAGChatResponse> {
        try {
            const response = await apiClient.post(
                '/api/v1/chat/rag',
                {
                    question,
                    session_id: this.getSessionId(),
                    user_id: userId || null,
                    ...modelOverrides,
                },
                // Chat degrades gracefully for guests instead of hard-redirecting.
                { onUnauthorized: 'throw' },
            );

            if (response.session_id) {
                currentSessionId = response.session_id;
            }

            return response as RAGChatResponse;
        } catch (error) {
            const status = (error as { status?: number } | null)?.status;
            if (status === 401) {
                // Guests (or expired sessions): prompt to log in, in Vietnamese.
                console.warn('[ChatService] chat requires login (401)');
                return {
                    response:
                        'Bạn ơi, hãy đăng nhập để trò chuyện với Lexi nhé! 🔑',
                    sources: [],
                    session_id: this.getSessionId(),
                    requires_login: true,
                };
            }
            console.error('[ChatService] RAG request failed:', error);
            return {
                response: "Sorry, I ran into an error. Please try again! 🙏",
                sources: [],
                session_id: this.getSessionId(),
            };
        }
    },

    /**
     * Send message using legacy endpoint (backward compatibility)
     */
    async sendMessage(message: string, context: string = ""): Promise<string> {
        const response = await apiClient.post('/api/v1/chat/message', {
            message,
            context,
        });
        return response.response;
    },

    /**
     * Analyze pronunciation
     */
    async analyzePronunciation(targetText: string, audioText: string): Promise<PronunciationResult> {
        const response = await apiClient.post('/api/v1/chat/pronunciation', {
            target_text: targetText,
            audio_text: audioText,
        });
        return response;
    },

    /**
     * Test embedding generation (debug)
     */
    async testEmbedding(text: string): Promise<{ status: string; embedding_length: number }> {
        const response = await apiClient.post('/api/v1/chat/test-embedding', { text });
        return response;
    },
};


