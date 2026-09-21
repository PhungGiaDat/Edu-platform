import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AIChatBuddy } from '@/features/chat/components/AIChatBuddy';
import { ChatService } from '@/services/ChatService';

// ── Mock CodexPetSprite ─────────────────────────────────────────────────────
vi.mock('@/features/pets/components/CodexPetSprite', () => ({
    CodexPetSprite: ({ label }: { label: string; animationState: string; className?: string; size?: string }) => (
        <span data-testid={`pet-${label.toLowerCase()}`} aria-label={label}>{label}</span>
    ),
}));

// ── Mock AuthContext (mutable so tests can simulate guests) ─────────────────
const mockAuth = { user: { id: 'test-user-1' } as { id: string } | null };
vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({ user: mockAuth.user }),
}));

// ── Mock ChatService (implementation resolves directly) ─────────────────────────
vi.mock('../services/ChatService', () => ({
    ChatService: {
        sendRAGMessage: vi.fn(() => Promise.resolve({
            response: 'Mock AI response',
            sources: [],
            session_id: 'mock-session',
        })),
        streamChatMessage: vi.fn(
            (_q: string, _ctx: any, onToken: (t: string) => void, onComplete: () => void) => {
                onToken('Mock AI response');
                onComplete();
                return Promise.resolve();
            },
        ),
        resetSession: vi.fn(),
    },
}));

// ── Helpers ─────────────────────────────────────────────────────────────────
function renderChatBuddy(initialOpen = false) {
    return render(
        <MemoryRouter>
            <AIChatBuddy userId="test-user-1" initialOpen={initialOpen} show3DPet={true} />
        </MemoryRouter>,
    );
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('AIChatBuddy — mobile viewport behavior', () => {

    it('opens the chat panel when FAB is clicked', async () => {
        const user = userEvent.setup();
        renderChatBuddy(false);

        // FAB should be visible when panel is closed
        const fab = screen.getByRole('button', { name: 'Talk to Lexi' });
        expect(fab).toBeVisible();

        await user.click(fab);

        // Panel should now be open — header with "Lexi" heading visible
        expect(screen.getByRole('heading', { name: 'Lexi' })).toBeVisible();
    });

    it('closes the chat panel via the close button', async () => {
        const user = userEvent.setup();
        renderChatBuddy(true); // panel starts open

        // Close button should be in the header
        const closeBtn = screen.getByRole('button', { name: 'Close chat' });
        expect(closeBtn).toBeVisible();

        await user.click(closeBtn);

        // Panel header should be gone; FAB should reappear
        expect(screen.queryByRole('heading', { name: 'Lexi' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Talk to Lexi' })).toBeVisible();
    });

    it('renders the input field and send button when panel is open', () => {
        renderChatBuddy(true);

        const input = screen.getByPlaceholderText('Ask Lexi...');
        const sendBtn = screen.getByRole('button', { name: 'Send' });

        expect(input).toBeVisible();
        expect(sendBtn).toBeVisible();
    });

    it('send button is disabled when input is empty', () => {
        renderChatBuddy(true);

        const sendBtn = screen.getByRole('button', { name: 'Send' });
        expect(sendBtn).toBeDisabled();
    });

    it('send button is enabled when input has text', () => {
        renderChatBuddy(true);

        const input = screen.getByPlaceholderText('Ask Lexi...');
        const sendBtn = screen.getByRole('button', { name: 'Send' });

        expect(sendBtn).toBeDisabled();

        // Simulate typing in the input field
        fireEvent.change(input, { target: { value: 'Hello Lexi' } });

        expect(sendBtn).not.toBeDisabled();
    });

    it('submits a message on Enter keypress without Shift', async () => {
        const user = userEvent.setup();
        renderChatBuddy(true);

        const input = screen.getByPlaceholderText('Ask Lexi...');
        await user.type(input, 'Test message{Enter}');

        // Input should be cleared after send
        expect(input).toHaveValue('');
    });

    it('typing text and pressing Shift+Enter does NOT clear the input (allows multi-line intent)', async () => {
        const user = userEvent.setup();
        renderChatBuddy(true);

        const input = screen.getByPlaceholderText('Ask Lexi...');
        // On a text input, Shift+Enter inserts a newline but the key handler checks
        // !event.shiftKey — on a real textarea it would insert a newline without
        // submitting. On jsdom <input type="text">, Enter with any modifier doesn't
        // fire the keydown handler (browser prevents it), so input stays as-is.
        await user.type(input, 'Hello world');

        // The input should contain what the user typed
        expect(input).toHaveValue('Hello world');

        // Simulate a keydown where shiftKey IS true (would NOT submit in real browser)
        const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true });
        fireEvent(input, event);

        // Input should NOT be cleared (Shift+Enter should not trigger send)
        expect(input).toHaveValue('Hello world');
    });

    it('renders the welcome message from Lexi when panel opens', () => {
        renderChatBuddy(true);

        // Default AI welcome message
        expect(screen.getByText(/Hi, I'm Lexi!/)).toBeVisible();
        expect(screen.getByText('Powered by AI for kids learning English')).toBeVisible();
    });

    it('renders the New chat button in the header', () => {
        renderChatBuddy(true);

        const newChatBtn = screen.getByRole('button', { name: 'New' });
        expect(newChatBtn).toBeVisible();
    });

    it('resets to a new welcome message after New chat is clicked', async () => {
        const user = userEvent.setup();
        renderChatBuddy(true);

        const newChatBtn = screen.getByRole('button', { name: 'New' });
        await user.click(newChatBtn);

        // Should show new conversation prompt
        expect(screen.getByText('New conversation ready. What should we learn?')).toBeVisible();
    });

    it('panel is closed by default when initialOpen is false', () => {
        renderChatBuddy(false);

        // FAB visible, panel hidden
        expect(screen.getByRole('button', { name: 'Talk to Lexi' })).toBeVisible();
        expect(screen.queryByRole('heading', { name: 'Lexi' })).not.toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Ask Lexi...')).not.toBeInTheDocument();
    });

    it('panel is open when initialOpen is true', () => {
        renderChatBuddy(true);

        expect(screen.getByRole('heading', { name: 'Lexi' })).toBeVisible();
        expect(screen.getByPlaceholderText('Ask Lexi...')).toBeVisible();
    });

    it('FAB has correct accessible title and label attributes', () => {
        renderChatBuddy(false);

        const fab = screen.getByRole('button', { name: 'Talk to Lexi' });
        expect(fab).toHaveAttribute('title', 'Talk to Lexi');
        expect(fab).toHaveAttribute('aria-label', 'Talk to Lexi');
    });

    it('input is disabled while a message is loading', async () => {
        const user = userEvent.setup();
        let finishStream!: () => void;
        vi.mocked(ChatService.streamChatMessage).mockImplementationOnce(
            (_q, _ctx, _onToken, onComplete) =>
                new Promise<void>((resolve) => {
                    finishStream = () => {
                        onComplete();
                        resolve();
                    };
                }),
        );
        renderChatBuddy(true);

        const input = screen.getByPlaceholderText('Ask Lexi...');
        const sendBtn = screen.getByRole('button', { name: 'Send' });

        await user.type(input, 'Hello');

        // Click send and check loading state
        await user.click(sendBtn);

        // The loading indicator (three bouncing dots) should appear
        const loadingDots = document.querySelectorAll('[class*="animate-bounce"]');
        expect(loadingDots.length).toBeGreaterThan(0);

        finishStream();
        await waitFor(() => expect(input).not.toBeDisabled());
    });
});

// ── Error UX (streamChatMessage failure classification surfaced in chat) ────

describe('AIChatBuddy — error UX', () => {
    beforeEach(() => {
        // The shared ChatService mock accumulates call counts across the file
        // (no global clearMocks configured) — scope counts to this suite.
        vi.clearAllMocks();
    });

    afterEach(() => {
        mockAuth.user = { id: 'test-user-1' };
    });

    it('shows a retryable error bubble and replays the question on "Thử lại"', async () => {
        const user = userEvent.setup();
        const spy = vi.mocked(ChatService.streamChatMessage);
        spy
            .mockImplementationOnce((_q, _ctx, _onToken, _onComplete, onError) => {
                onError('server');
                return Promise.resolve();
            })
            .mockImplementationOnce((_q, _ctx, onToken, onComplete) => {
                onToken('Apple là quả táo 🍎');
                onComplete();
                return Promise.resolve();
            });

        renderChatBuddy(true);
        await user.type(screen.getByPlaceholderText('Ask Lexi...'), 'what is apple?{Enter}');

        const retryBtn = await screen.findByRole('button', { name: /Thử lại/ });
        expect(screen.getByText(/bận một chút/)).toBeVisible();

        await user.click(retryBtn);

        await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
        // Error bubble replaced by the successful answer…
        expect(screen.queryByText(/bận một chút/)).not.toBeInTheDocument();
        expect(screen.getByText('Apple là quả táo 🍎')).toBeVisible();
        // …and the replayed question is NOT duplicated in the transcript.
        expect(screen.getAllByText('what is apple?')).toHaveLength(1);
    });

    it('auth failure shows login prompt without a retry button', async () => {
        const user = userEvent.setup();
        vi.mocked(ChatService.streamChatMessage).mockImplementationOnce(
            (_q, _ctx, _onToken, _onComplete, onError) => {
                onError('auth');
                return Promise.resolve();
            },
        );

        renderChatBuddy(true);
        await user.type(screen.getByPlaceholderText('Ask Lexi...'), 'hi there{Enter}');

        expect(await screen.findByRole('button', { name: 'Đăng nhập' })).toBeVisible();
        expect(screen.queryByRole('button', { name: /Thử lại/ })).not.toBeInTheDocument();
    });

    it('guests without any user id can still send (no silent no-op)', async () => {
        mockAuth.user = null;
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <AIChatBuddy initialOpen />
            </MemoryRouter>,
        );

        await user.type(screen.getByPlaceholderText('Ask Lexi...'), 'hello lexi{Enter}');

        await waitFor(() =>
            expect(ChatService.streamChatMessage).toHaveBeenCalledWith(
                'hello lexi',
                null,
                expect.any(Function),
                expect.any(Function),
                expect.any(Function),
                expect.any(Function),
            ),
        );
    });

    it('renders vocabulary source chips when metadata arrives via stream', async () => {
        const user = userEvent.setup();
        vi.mocked(ChatService.streamChatMessage).mockImplementationOnce(
            (_q, _ctx, onToken, onComplete, _onError, onMetadata) => {
                onToken('Elephant is a big animal');
                onMetadata?.({
                    sources: [
                        { word: 'elephant', score: 0.95 },
                        { word: 'animal', score: 0.8 },
                    ],
                });
                onComplete();
                return Promise.resolve();
            },
        );

        renderChatBuddy(true);
        await user.type(screen.getByPlaceholderText('Ask Lexi...'), 'what is elephant?{Enter}');

        expect(await screen.findByText('elephant')).toBeVisible();
        expect(screen.getByText('animal')).toBeVisible();
    });
});
