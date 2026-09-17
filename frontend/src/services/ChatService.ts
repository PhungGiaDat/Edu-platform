// services/ChatService.ts
/**
 * Chat Service - Handles AI chat API calls including RAG
 */
import { apiClient } from './apiClient';
import { getApiBase } from '@/config';

// ========== Types ==========
export interface ChatResponse {
    response: string;
}

export type ChatErrorKind = 'auth' | 'offline' | 'timeout' | 'server' | 'unknown';

export interface RAGChatResponse {
    response: string;
    sources: { word: string; score: number }[];
    session_id: string;
    agent_trace?: string[];
    /** True when the backend rejected an anonymous call (HTTP 401). */
    requires_login?: boolean;
    /** Present when the call failed — drives the error bubble + retry UI. */
    error_kind?: ChatErrorKind;
    /** Whether re-sending the same question makes sense (everything but auth). */
    retryable?: boolean;
}

/**
 * RAG pipeline = up to 3 sequential LLM calls; observed 15–60s end-to-end on
 * Gemini flash. A 90s ceiling stops a hung request from freezing the chat
 * forever (fetch has no default timeout) while never cutting off a healthy call.
 */
const RAG_TIMEOUT_MS = 90_000;

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
     * Stream chat message using isolated OpenRouter SSE endpoint (/api/v1/chat/stream).
     * Hard-cut: Never falls back to /chat/rag or sendRAGMessage.
     */
    async streamChatMessage(
        question: string,
        onToken: (token: string) => void,
        onComplete: () => void,
        onError: (kind: ChatErrorKind) => void,
    ): Promise<void> {
        const url = `${getApiBase()}/api/v1/chat/stream`;
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    question,
                    session_id: this.getSessionId(),
                }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    onError('auth');
                    return;
                }
                if (response.status >= 500) {
                    onError('server');
                    return;
                }
                onError('unknown');
                return;
            }

            if (!response.body) {
                onError('server');
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data:')) continue;
                    const dataStr = trimmed.replace(/^data:\s*/, '');
                    if (dataStr === '[DONE]') {
                        onComplete();
                        return;
                    }
                    if (dataStr === '[ERROR]') {
                        onError('server');
                        return;
                    }
                    try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed.token) {
                            onToken(parsed.token);
                        }
                    } catch {
                        // ignore malformed lines
                    }
                }
            }

            if (buffer.trim().startsWith('data:')) {
                const dataStr = buffer.trim().replace(/^data:\s*/, '');
                if (dataStr === '[DONE]') {
                    onComplete();
                    return;
                }
                if (dataStr === '[ERROR]') {
                    onError('server');
                    return;
                }
                try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.token) {
                        onToken(parsed.token);
                    }
                } catch {
                    // ignore
                }
            }

            onComplete();
        } catch (error) {
            console.error('[ChatService] streamChatMessage error:', error);
            const errName = (error as { name?: string } | null)?.name;
            if (errName === 'AbortError' || errName === 'TimeoutError') {
                onError('timeout');
            } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
                onError('offline');
            } else {
                onError('server');
            }
        }
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
                // Chat degrades gracefully for guests instead of hard-redirecting;
                // the signal bounds a hung pipeline (RequestInit passes through fetch).
                { onUnauthorized: 'throw', signal: AbortSignal.timeout(RAG_TIMEOUT_MS) },
            );

            if (response.session_id) {
                currentSessionId = response.session_id;
            }

            return response as RAGChatResponse;
        } catch (error) {
            const status = (error as { status?: number } | null)?.status;
            const errName = (error as { name?: string } | null)?.name;
            console.error('[ChatService] RAG request failed:', error);

            const shaped = (
                text: string,
                kind: ChatErrorKind,
                retryable: boolean,
                extra?: Partial<RAGChatResponse>,
            ): RAGChatResponse => ({
                response: text,
                sources: [],
                session_id: this.getSessionId(),
                error_kind: kind,
                retryable,
                ...extra,
            });

            // Guests / expired sessions: prompt to log in, in Vietnamese.
            if (status === 401) {
                return shaped(
                    'Bạn ơi, hãy đăng nhập để trò chuyện với Lexi nhé! 🔑',
                    'auth',
                    false,
                    { requires_login: true },
                );
            }
            // Client-side 90s ceiling fired (AbortSignal.timeout → TimeoutError).
            if (errName === 'TimeoutError' || errName === 'AbortError') {
                return shaped(
                    'Câu hỏi này khiến Lexi nghĩ lâu quá… Bạn thử lại lần nữa nhé! ⏳',
                    'timeout',
                    true,
                );
            }
            // Backend / LLM provider blew up.
            if (typeof status === 'number' && status >= 500) {
                return shaped(
                    'Lexi đang gặp chút trục trặc từ server. Đợi vài giây rồi thử lại nhé! 🤖',
                    'server',
                    true,
                );
            }
            // fetch() network failure (offline / DNS / CORS): error carries no status.
            if (!status) {
                return shaped(
                    'Không kết nối được tới server. Bạn kiểm tra mạng rồi thử lại nhé! 📡',
                    'offline',
                    true,
                );
            }
            return shaped(
                'Có gì đó không ổn, Lexi chưa trả lời được câu này. Bạn thử lại nhé! 🙏',
                'unknown',
                true,
            );
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


