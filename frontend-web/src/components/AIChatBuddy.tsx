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
                    className="group fixed bottom-20 right-3 h-28 w-28 cursor-pointer p-0 transition-transform duration-300 hover:scale-105 md:bottom-6 md:right-6 md:h-32 md:w-32"
                    style={{
                        zIndex: 'var(--z-chatbot)',
                        background: 'transparent',
                        backgroundColor: 'transparent',
                        border: 0,
                        borderRadius: 0,
                        boxShadow: 'none',
                        minWidth: 0,
                        minHeight: 0,
                        outlineOffset: 6,
                        WebkitTapHighlightColor: 'transparent',
                    }}
                    title="Talk to Lexi"
                    aria-label="Talk to Lexi"
                >
                    <span className="absolute -left-28 top-2 hidden w-32 rounded-2xl border-2 border-sky-100 bg-white px-3 py-2 text-left text-xs font-black leading-tight text-slate-700 shadow-[0_10px_24px_rgba(91,141,239,0.18)] transition-transform duration-300 group-hover:-translate-y-1 sm:block">
                        Need help?
                        <span className="block font-bold text-sky-500">Ask Lexi!</span>
                        <span className="absolute -right-2 top-8 h-4 w-4 rotate-45 border-r-2 border-t-2 border-sky-100 bg-white" />
                    </span>
                    <CodexPetSprite
                        animationState="waiting"
                        className="drop-shadow-2xl"
                        label="Lexi"
                        size="100%"
                    />
                </button>
            )}

            {isOpen && (
                <div
                    className="fixed right-3 flex h-[min(560px,calc(100dvh-112px))] w-[calc(100vw-1.5rem)] max-w-[410px] animate-slideUp flex-col overflow-hidden rounded-[28px] border-4 border-white/80 shadow-[0_16px_0_rgba(91,141,239,0.10),0_26px_56px_rgba(45,60,90,0.18)] md:right-6"
                    style={{
                        bottom: 112,
                        zIndex: 'var(--z-chatbot)',
                        fontFamily: "'Nunito Sans', 'Quicksand', sans-serif",
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,249,255,0.98) 100%)',
                    }}
                >
                    <div className="relative overflow-hidden bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-300 p-4">
                        <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/20" />
                        <div className="absolute bottom-0 left-12 h-14 w-14 rounded-full bg-yellow-200/25" />
                        <div className="relative flex items-center justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/90 shadow-[0_5px_0_rgba(30,87,153,0.16)]">
                                <CodexPetSprite animationState="waving" label="Lexi" size={52} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="truncate text-xl font-black text-white drop-shadow-sm">Lexi</h3>
                                <span className="rounded-full bg-white/35 px-2.5 py-1 text-xs font-black text-white">
                                    English buddy
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleNewChat}
                                className="rounded-full border-2 border-white/30 bg-white/25 px-3 py-1.5 text-sm font-black text-white transition-colors hover:bg-white/35"
                                title="Start new conversation"
                            >
                                New
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/30 bg-white/25 text-lg font-black text-white transition-colors hover:bg-white/35"
                                aria-label="Close chat"
                            >
                                x
                            </button>
                        </div>
                        </div>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ background: 'linear-gradient(180deg, #F8FCFF 0%, #FFF8ED 100%)' }}>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'ai' && (
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_4px_0_rgba(91,141,239,0.12)]">
                                        <CodexPetSprite animationState="idle" label="Lexi" size={38} />
                                    </div>
                                )}

                                <div className="max-w-[80%]">
                                    <div
                                        className={`rounded-2xl p-3 text-sm font-medium ${
                                            msg.role === 'user'
                                                ? 'rounded-br-sm bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-[0_4px_0_rgba(14,165,233,0.18)]'
                                                : 'rounded-bl-sm border-2 border-yellow-100 bg-white text-slate-700 shadow-[0_4px_0_rgba(251,191,36,0.12)]'
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
                                <div className="rounded-2xl rounded-bl-sm border-2 border-yellow-100 bg-white p-3 shadow-sm">
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

                    <div className="border-t-2 border-sky-100 bg-white p-3">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask Lexi..."
                                className="min-w-0 flex-1 rounded-2xl border-2 border-sky-100 bg-sky-50/70 px-4 py-3 text-sm font-bold text-slate-700 placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                disabled={isLoading}
                            />
                            <button
                                onClick={() => void handleSend()}
                                disabled={isLoading || !input.trim()}
                                className="rounded-2xl border-0 bg-gradient-to-br from-yellow-300 to-orange-300 px-5 font-black text-slate-800 shadow-[0_5px_0_rgba(245,158,11,0.24)] transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
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
