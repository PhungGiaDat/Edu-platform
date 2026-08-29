import React, { useEffect, useRef, useState } from 'react';
import { CodexPetSprite } from '@/features/pets/components/CodexPetSprite';
import { useAuth } from '@/contexts/AuthContext';
import { ChatService } from '@/services/ChatService';

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    sources?: { word: string; score: number }[];
    agentTrace?: string[];
}

interface AIChatBuddyProps {
    userId?: string;
    initialOpen?: boolean;
    show3DPet?: boolean;
}

// ─── Agent trace debug ────────────────────────────────────────────────────────
function AgentTrace({ trace }: { trace: string[] }) {
    const [open, setOpen] = useState(false);
    if (!trace.length) return null;
    return (
        <div className="mt-1">
            <button
                onClick={() => setOpen((o) => !o)}
                className="text-xs text-slate-400 underline"
            >
                {open ? '▲' : '▼'} Debug
            </button>
            {open && (
                <div className="mt-1 rounded-lg bg-slate-50 p-2 font-mono text-xs text-slate-400">
                    {trace.map((s, i) => (
                        <div key={i}>{s}</div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main component ────────────────────────────────────────────────────────────
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
            const response = await ChatService.sendRAGMessage(input, effectiveUserId);
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: response.response,
                sources: response.sources,
                agentTrace: response.agent_trace,
            };
            setMessages((prev) => [...prev, aiMsg]);
        } catch {
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
            {/* Floating pet button */}
            {!isOpen && show3DPet && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="ai-chat-buddy__fab group fixed bottom-[calc(env(safe-area-inset-bottom)+7.5rem)] right-2 flex h-[clamp(4.25rem,20vw,5rem)] w-[clamp(4.25rem,20vw,5rem)] cursor-pointer items-center justify-center rounded-full p-0 transition-transform duration-300 sm:right-4 md:bottom-6 md:right-6 md:h-20 md:w-20 lg:h-[92px] lg:w-[92px]"
                    style={{
                        zIndex: 'var(--z-chatbot)',
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.99) 0%, rgba(255,248,213,0.99) 48%, rgba(219,244,255,0.99) 100%)',
                        border: '4px solid rgba(255, 255, 255, 0.96)',
                        borderRadius: '9999px',
                        boxShadow: '0 6px 0 #3F6FCB, 0 12px 24px rgba(45,70,125,0.22), inset 0 2px 0 rgba(255,255,255,0.98)',
                        padding: 0,
                        minWidth: 0,
                        minHeight: 0,
                        overflow: 'visible',
                        outlineOffset: 6,
                        WebkitTapHighlightColor: 'transparent',
                    }}
                    title="Talk to Lexi"
                    aria-label="Talk to Lexi"
                    aria-controls="lexi-chat-panel"
                    aria-expanded={isOpen}
                >
                    <span aria-hidden="true" className="pointer-events-none absolute -left-20 top-2 hidden w-28 rounded-2xl border-2 border-sky-100 bg-white px-3 py-2 text-left text-xs font-black leading-tight text-slate-700 shadow-[0_10px_24px_rgba(91,141,239,0.18)] motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-translate-y-1 sm:block sm:-left-28 sm:w-32">
                        Need help?
                        <span className="block font-bold text-sky-500">Ask Lexi!</span>
                        <span className="absolute -right-2 top-8 h-4 w-4 rotate-45 border-r-2 border-t-2 border-sky-100 bg-white" />
                    </span>
                    <CodexPetSprite animationState="waiting" className="h-full w-full min-h-0 min-w-0 flex-1 drop-shadow-2xl" label="Lexi" size="100%" />
                </button>
            )}

            {/* Chat panel */}
            {isOpen && (
                <div
                    id="lexi-chat-panel"
                    role="dialog"
                    aria-label="Lexi chat"
                    className="ai-chat-buddy__panel fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] top-[calc(env(safe-area-inset-top)+0.5rem)] flex h-[min(620px,calc(100dvh-env(safe-area-inset-bottom)-env(safe-area-inset-top)-8.5rem))] max-h-[calc(100dvh-env(safe-area-inset-bottom)-env(safe-area-inset-top)-8.5rem)] min-h-0 animate-slideUp flex-col overflow-hidden rounded-[24px] border-4 border-white/80 shadow-[0_16px_0_rgba(91,141,239,0.10),0_26px_56px_rgba(45,60,90,0.18)] md:bottom-6 md:left-auto md:right-6 md:top-auto md:h-[min(560px,calc(100dvh-3rem))] md:max-h-[calc(100dvh-3rem)] md:w-[410px] md:rounded-[28px]"
                    style={{
                        zIndex: 'var(--z-chatbot)',
                        fontFamily: "'Nunito Sans', 'Quicksand', sans-serif",
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,249,255,0.98) 100%)',
                    }}
                >
                    {/* Header */}
                    <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-300 p-2.5 min-[390px]:p-3 sm:p-4">
                        <div aria-hidden="true" className="pointer-events-none absolute right-4 -top-10 h-28 w-28 rounded-full bg-white/20" />
                        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-12 h-14 w-14 rounded-full bg-yellow-200/25" />
                        <div className="relative flex min-w-0 items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-1 items-center gap-1.5 min-[390px]:gap-2 sm:gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/90 p-[3px] shadow-[0_5px_0_rgba(30,87,153,0.16)] min-[390px]:h-12 min-[390px]:w-12 min-[390px]:rounded-2xl sm:h-14 sm:w-14 sm:p-1">
                                    <CodexPetSprite animationState="waving" label="Lexi" size="100%" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="truncate text-lg font-black text-white drop-shadow-sm sm:text-xl">Lexi</h3>
                                    <span className="inline-flex max-w-full whitespace-nowrap rounded-full bg-white/35 px-2.5 py-1 text-xs font-black text-white">
                                        English buddy
                                    </span>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5 min-[390px]:gap-2">
                                <button
                                    onClick={handleNewChat}
                                    className="min-h-10 shrink-0 rounded-full border-2 border-white/30 bg-white/25 px-2.5 py-1 text-xs font-black text-white transition-colors hover:bg-white/35 min-[390px]:min-h-[44px] min-[390px]:px-3 min-[390px]:py-1.5 min-[390px]:text-sm"
                                    title="Start new conversation"
                                >
                                    New
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/30 bg-white/25 text-base font-black text-white transition-colors hover:bg-white/35 min-[390px]:h-11 min-[390px]:w-11 min-[390px]:text-lg"
                                    aria-label="Close chat"
                                >
                                    x
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div
                        className="min-h-0 min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain pb-[calc(3.5rem+env(safe-area-inset-bottom))] p-2.5 sm:pb-4"
                        style={{ background: 'linear-gradient(180deg, #F8FCFF 0%, #FFF8ED 100%)' }}
                    >
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex min-w-0 gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'ai' && (
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white p-[3px] shadow-[0_4px_0_rgba(91,141,239,0.12)]">
                                        <CodexPetSprite animationState="idle" label="Lexi" size="100%" />
                                    </div>
                                )}

                                <div className="min-w-0 max-w-[85%] sm:max-w-[80%]">
                                    <div
                                        className={`break-words rounded-2xl p-3 text-sm font-medium [overflow-wrap:anywhere] ${
                                            msg.role === 'user'
                                                ? 'rounded-br-sm bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-[0_4px_0_rgba(14,165,233,0.18)]'
                                                : 'rounded-bl-sm border-2 border-yellow-100 bg-white text-slate-700 shadow-[0_4px_0_rgba(251,191,36,0.12)]'
                                        }`}
                                    >
                                        {msg.content}
                                    </div>

                                    {/* Source chips */}
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

                                    {/* Agent trace */}
                                    {msg.agentTrace && <AgentTrace trace={msg.agentTrace} />}
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

                    {/* Input */}
                    <div className="shrink-0 border-t-2 border-sky-100 bg-white p-2.5 min-[390px]:p-3">
                        <div className="flex min-w-0 items-end gap-1.5 min-[390px]:gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask Lexi..."
                                className="min-h-[44px] min-w-0 flex-1 rounded-2xl border-2 border-sky-100 bg-sky-50/70 px-4 py-3 text-base font-bold text-slate-700 placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 sm:text-sm"
                                disabled={isLoading}
                            />
                            <button
                                onClick={() => void handleSend()}
                                disabled={isLoading || !input.trim()}
                                className="min-h-[44px] shrink-0 rounded-2xl border-0 bg-gradient-to-br from-yellow-300 to-orange-300 px-4 font-black text-slate-800 shadow-[0_5px_0_rgba(245,158,11,0.24)] transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 sm:px-5"
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
