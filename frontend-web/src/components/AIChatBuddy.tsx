import React, { useEffect, useRef, useState } from 'react';
import { CodexPetSprite } from '@/components/pets/CodexPetSprite';
import { useAuth } from '../contexts/AuthContext';
import { ChatService, type RAGChatResponse } from '../services/ChatService';

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    sources?: { word: string; score: number }[];
}

interface AIChatBuddyProps {
    userId?: string;
    initialOpen?: boolean;
    show3DPet?: boolean;
}

export const AIChatBuddy: React.FC<AIChatBuddyProps> = ({
    userId,
    initialOpen = false,
    show3DPet = true,
}) => {
    const { user } = useAuth();
    const effectiveUserId = user?.id || userId;
    const [isOpen, setIsOpen] = useState(initialOpen);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'ai',
            content: "Hi, I'm Lexi! Ask me anything about English learning.",
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading || !effectiveUserId) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response: RAGChatResponse = await ChatService.sendRAGMessage(input, effectiveUserId);
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: response.response,
                sources: response.sources,
            };
            setMessages((prev) => [...prev, aiMsg]);
        } catch (error) {
            console.error('[AIChatBuddy] Chat error:', error);
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: 'ai',
                    content: 'Oops, I ran into a problem. Please try again!',
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewChat = () => {
        ChatService.resetSession();
        setMessages([
            {
                id: Date.now().toString(),
                role: 'ai',
                content: 'New conversation ready. What should we learn?',
            },
        ]);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void handleSend();
        }
    };

    return (
        <>
            {!isOpen && show3DPet && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-20 right-4 h-24 w-24 cursor-pointer border-0 bg-transparent p-0 drop-shadow-2xl transition-all duration-300 hover:scale-110 md:bottom-6 md:right-6 md:h-32 md:w-32"
                    style={{
                        zIndex: 'var(--z-chatbot)',
                        WebkitTapHighlightColor: 'transparent',
                    }}
                    title="Talk to Lexi"
                    aria-label="Talk to Lexi"
                >
                    <CodexPetSprite
                        animationState="idle"
                        label="Lexi"
                        size="100%"
                    />
                </button>
            )}

            {isOpen && (
                <div
                    className="fixed right-4 flex h-[500px] w-[92vw] max-w-[380px] animate-slideUp flex-col overflow-hidden clay-card md:right-6"
                    style={{
                        bottom: 144,
                        zIndex: 'var(--z-chatbot)',
                        fontFamily: "'Nunito Sans', 'Quicksand', sans-serif",
                        background: 'var(--color-surface)',
                        border: '3px solid var(--color-border)',
                    }}
                >
                    <div className="flex items-center justify-between bg-gradient-to-r from-sky-400 to-cyan-500 p-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white shadow-md">
                                <CodexPetSprite animationState="waving" label="Lexi" size={44} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="truncate text-lg font-bold text-white">Lexi</h3>
                                <span className="rounded-full bg-white/30 px-2 py-0.5 text-xs font-medium text-white">
                                    Ready to help
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleNewChat}
                                className="rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/30 hover:text-white"
                                title="Start new conversation"
                            >
                                New
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white/80 transition-colors hover:bg-white/30 hover:text-white"
                                aria-label="Close chat"
                            >
                                x
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ background: 'var(--color-surface-soft)' }}>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'ai' && (
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                                        <CodexPetSprite animationState="idle" label="Lexi" size={30} />
                                    </div>
                                )}

                                <div className="max-w-[80%]">
                                    <div
                                        className={`rounded-2xl p-3 text-sm font-medium ${
                                            msg.role === 'user'
                                                ? 'rounded-br-sm bg-gradient-to-br from-amber-400 to-orange-400 text-white'
                                                : 'rounded-bl-sm border-2 border-amber-200 bg-white text-gray-700 shadow-sm'
                                        }`}
                                    >
                                        {msg.content}
                                    </div>

                                    {msg.role === 'ai' && msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {msg.sources.map((src, idx) => (
                                                <span
                                                    key={`${src.word}-${idx}`}
                                                    className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-600"
                                                    title={`Relevance: ${(src.score * 100).toFixed(0)}%`}
                                                >
                                                    {src.word}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="rounded-2xl rounded-bl-sm border-2 border-amber-200 bg-white p-3 shadow-sm">
                                    <div className="flex gap-1.5">
                                        <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-sky-400" style={{ animationDelay: '0ms' }} />
                                        <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-sky-400" style={{ animationDelay: '150ms' }} />
                                        <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-sky-400" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="border-t-2 border-amber-200 bg-white p-3">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask Lexi..."
                                className="flex-1 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-gray-700 placeholder-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                disabled={isLoading}
                            />
                            <button
                                onClick={() => void handleSend()}
                                disabled={isLoading || !input.trim()}
                                className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 px-5 font-bold text-white shadow-md shadow-amber-500/30 transition-all duration-200 hover:scale-105 hover:from-amber-500 hover:to-orange-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                            >
                                Send
                            </button>
                        </div>
                        <p className="mt-2 text-center text-xs text-gray-400">
                            Powered by AI for kids learning English
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};

export default AIChatBuddy;
