// __tests__/chatServiceErrorClassification.test.ts
/**
 * Unit tests for ChatService.sendRAGMessage error taxonomy (Task 2 — chat UX).
 *
 * The AIChatBuddy tests mock ChatService entirely, so the classification logic
 * itself lives here: every failure mode must surface a Vietnamese message with
 * the right `error_kind` / `retryable` flags instead of one generic English string.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/apiClient';
import { ChatService } from '@/services/ChatService';

vi.mock('@/services/apiClient', () => ({
    apiClient: {
        post: vi.fn(),
        get: vi.fn(),
    },
}));

function apiErr(message: string, status?: number): Error {
    const e = new Error(message) as Error & { status?: number };
    if (status !== undefined) e.status = status;
    return e;
}

describe('ChatService.sendRAGMessage — error classification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('passes a successful response through untouched', async () => {
        vi.mocked(apiClient.post).mockResolvedValueOnce({
            response: 'Chào bạn!',
            sources: [],
            session_id: 's1',
        });

        const res = await ChatService.sendRAGMessage('hi', 'u1');

        expect(res.response).toBe('Chào bạn!');
        expect(res.error_kind).toBeUndefined();
        expect(res.retryable).toBeUndefined();
    });

    it('401 → auth kind, non-retryable, Vietnamese login prompt', async () => {
        vi.mocked(apiClient.post).mockRejectedValueOnce(apiErr('Unauthorized', 401));

        const res = await ChatService.sendRAGMessage('hi', 'u1');

        expect(res.error_kind).toBe('auth');
        expect(res.requires_login).toBe(true);
        expect(res.retryable).toBe(false);
        expect(res.response).toContain('đăng nhập');
    });

    it('AbortSignal.timeout (TimeoutError) → timeout kind, retryable', async () => {
        const e = new Error('The operation was aborted due to timeout');
        e.name = 'TimeoutError';
        vi.mocked(apiClient.post).mockRejectedValueOnce(e);

        const res = await ChatService.sendRAGMessage('hi', 'u1');

        expect(res.error_kind).toBe('timeout');
        expect(res.retryable).toBe(true);
        expect(res.response).toContain('lâu quá');
    });

    it('5xx → server kind, retryable', async () => {
        vi.mocked(apiClient.post).mockRejectedValueOnce(apiErr('Bad Gateway', 503));

        const res = await ChatService.sendRAGMessage('hi', 'u1');

        expect(res.error_kind).toBe('server');
        expect(res.retryable).toBe(true);
    });

    it('network failure (TypeError, no status) → offline kind, retryable', async () => {
        vi.mocked(apiClient.post).mockRejectedValueOnce(new TypeError('Failed to fetch'));

        const res = await ChatService.sendRAGMessage('hi', 'u1');

        expect(res.error_kind).toBe('offline');
        expect(res.retryable).toBe(true);
        expect(res.response).toContain('mạng');
    });

    it('other HTTP status (422) → unknown kind, retryable — never the old English string', async () => {
        vi.mocked(apiClient.post).mockRejectedValueOnce(apiErr('Unprocessable', 422));

        const res = await ChatService.sendRAGMessage('hi', 'u1');

        expect(res.error_kind).toBe('unknown');
        expect(res.retryable).toBe(true);
        expect(res.response).not.toContain('Sorry');
    });

    it('requests run with onUnauthorized=throw and an AbortSignal timeout', async () => {
        vi.mocked(apiClient.post).mockResolvedValueOnce({
            response: 'ok',
            sources: [],
            session_id: 's2',
        });

        await ChatService.sendRAGMessage('hi', 'u1');

        const opts = vi.mocked(apiClient.post).mock.calls[0][2] as {
            onUnauthorized?: string;
            signal?: AbortSignal;
        };
        expect(opts.onUnauthorized).toBe('throw');
        expect(opts.signal).toBeInstanceOf(AbortSignal);
    });
});
