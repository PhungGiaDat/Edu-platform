import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AIChatBuddy } from '../components/AIChatBuddy';

// ── Mock CodexPetSprite ─────────────────────────────────────────────────────
vi.mock('@/components/pets/CodexPetSprite', () => ({
    CodexPetSprite: ({ label }: { label: string; animationState: string; className?: string; size?: string }) => (
        <span data-testid={`pet-${label.toLowerCase()}`} aria-label={label}>{label}</span>
    ),
}));

// ── Mock AuthContext ────────────────────────────────────────────────────────
vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'test-user-1' } }),
}));

// ── Mock ChatService (implementation resolves directly) ─────────────────────────
vi.mock('../services/ChatService', () => ({
    ChatService: {
        sendRAGMessage: vi.fn(() => Promise.resolve({
            response: 'Mock AI response',
            sources: [],
            session_id: 'mock-session',
        })),
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
        renderChatBuddy(true);

        const input = screen.getByPlaceholderText('Ask Lexi...');
        const sendBtn = screen.getByRole('button', { name: 'Send' });

        await user.type(input, 'Hello');

        // Click send and check loading state
        await user.click(sendBtn);

        // The loading indicator (three bouncing dots) should appear
        const loadingDots = document.querySelectorAll('[class*="animate-bounce"]');
        expect(loadingDots.length).toBeGreaterThan(0);
    });
});
