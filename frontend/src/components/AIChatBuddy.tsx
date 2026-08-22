import React, { useEffect, useRef, useState } from 'react';
import { CodexPetSprite } from '@/components/pets/CodexPetSprite';
import { useAuth } from '../contexts/AuthContext';
import {
    ChatService,
    type ModelInfo,
    type ChatModelsResponse,
} from '../services/ChatService';

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

// ─── Model picker dropdown ─────────────────────────────────────────────────────
interface ModelPickerProps {
    models: ModelInfo[];
    defaults: Record<string, string>;
    selected: { planner: string; generator: string; validator: string };
    onChange: (sel: { planner: string; generator: string; validator: string }) => void;
}

function ModelPicker({ models, defaults, selected, onChange }: ModelPickerProps) {
    const [open, setOpen] = useState(false);

    const byRole = (role: string) => models.filter((m) => m.role === role);

    const toggleRole = (role: string, modelId: string) => {
        onChange({ ...selected, [role]: modelId });
    };

    const shortName = (id: string) => id.split('/').pop() ?? id;

    const ROLES = [
        { key: 'planner', label: 'Planner', emoji: '🧠' },
        { key: 'generator', label: 'Generator', emoji: '⚡' },
        { key: 'validator', label: 'Validator', emoji: '✅' },
    ] as const;

    return (
        <div className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex min-h-[36px] items-center gap-1.5 rounded-full border-2 border-white/40 bg-white/20 px-3 py-1.5 text-xs font-black text-white transition-colors hover:bg-white/35"
                title="Change AI models"
            >
                <span>⚙️</span>
                <span className="hidden sm:inline">Models</span>
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border-2 border-sky-100 bg-white p-3 shadow-xl">
                        <p className="mb-2 text-xs font-black text-sky-500">AI Models</p>
                        {ROLES.map(({ key, label, emoji }) => (
                            <div key={key} className="mb-2 last:mb-0">
                                <p className="mb-1 text-xs font-bold text-slate-500">
                                    {emoji} {label}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {byRole(key).map((m) => {
                                        const isActive = (selected[key] || defaults[key]) === m.id;
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => toggleRole(key, m.id)}
                                                className={`rounded-full px-2 py-0.5 text-xs font-bold transition-colors ${
                                                    isActive
                                                        ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-400'
                                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                }`}
                                                title={m.description}
                                            >
                                                {shortName(m.id)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => setOpen(false)}
                            className="mt-2 w-full rounded-xl bg-gradient-to-r from-yellow-300 to-orange-300 py-1.5 text-xs font-black text-slate-800 shadow-sm"
                        >
                            Done
                        </button>
                    </div>
                </>
            )}
        </div>
    );
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

    // Model picker state
    const [modelCatalog, setModelCatalog] = useState<ChatModelsResponse | null>(null);
    const [selectedModels, setSelectedModels] = useState({
        planner: '',
        generator: '',
        validator: '',
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch model catalog on mount
    useEffect(() => {
        if (isOpen) {
            ChatService.getModels()
                .then((catalog) => {
                    setModelCatalog(catalog);
                    const d = catalog.defaults;
                    setSelectedModels({ planner: d.planner, generator: d.generator, validator: d.validator });
                })
                .catch(() => {/* non-fatal */});
        }
    }, [isOpen]);

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
            const response = await ChatService.sendRAGMessage(
                input,
                effectiveUserId,
                {
                    planner_model: selectedModels.planner || undefined,
                    generator_model: selectedModels.generator || undefined,
                    validator_model: selectedModels.validator || undefined,
                },
            );
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
                    className="fixed bottom-[calc(env(safe-area-inset-bottom)+6rem)] right-2 flex h-14 w-14 cursor-pointer items-center justify-center p-0 transition-transform duration-300 motion-safe:hover:scale-105 sm:right-4 sm:bottom-6 sm:h-[68px] sm:w-[68px] md:bottom-6 md:right-6 md:h-20 md:w-20 lg:h-[92px] lg:w-[92px]"
                    style={{
                        zIndex: 'var(--z-chatbot)',
                        background: 'transparent',
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
                    <span className="absolute -left-20 top-2 hidden w-28 rounded-2xl border-2 border-sky-100 bg-white px-3 py-2 text-left text-xs font-black leading-tight text-slate-700 shadow-[0_10px_24px_rgba(91,141,239,0.18)] motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-translate-y-1 sm:block sm:-left-28 sm:w-32">
                        Need help?
                        <span className="block font-bold text-sky-500">Ask Lexi!</span>
                        <span className="absolute -right-2 top-8 h-4 w-4 rotate-45 border-r-2 border-t-2 border-sky-100 bg-white" />
                    </span>
                    <span className="block h-14 w-14 sm:h-[68px] sm:w-[68px] md:h-[72px] md:w-[72px] lg:h-[84px] lg:w-[84px]">
                        <CodexPetSprite animationState="waiting" className="drop-shadow-2xl" label="Lexi" size="100%" />
                    </span>
                </button>
            )}

            {/* Chat panel */}
            {isOpen && (
                <div
                    className="fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] flex h-[min(620px,calc(100dvh-env(safe-area-inset-bottom)-1rem))] max-h-[calc(100dvh-env(safe-area-inset-bottom)-1rem)] w-full max-w-md animate-slideUp flex-col overflow-hidden rounded-[24px] border-4 border-white/80 shadow-[0_16px_0_rgba(91,141,239,0.10),0_26px_56px_rgba(45,60,90,0.18)] sm:inset-x-4 md:inset-x-auto md:bottom-6 md:right-6 md:h-[min(560px,calc(100dvh-3rem))] md:w-[410px] md:rounded-[28px]"
                    style={{
                        zIndex: 'var(--z-chatbot)',
                        fontFamily: "'Nunito Sans', 'Quicksand', sans-serif",
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(239,249,255,0.98) 100%)',
                    }}
                >
                    {/* Header */}
                    <div className="relative overflow-hidden bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-300 p-3 sm:p-4">
                        <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/20" />
                        <div className="absolute bottom-0 left-12 h-14 w-14 rounded-full bg-yellow-200/25" />
                        <div className="relative flex items-center justify-between">
                            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/90 p-[3px] shadow-[0_5px_0_rgba(30,87,153,0.16)] sm:h-14 sm:w-14 sm:p-1">
                                    <CodexPetSprite animationState="waving" label="Lexi" size="100%" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="truncate text-lg font-black text-white drop-shadow-sm sm:text-xl">Lexi</h3>
                                    <span className="rounded-full bg-white/35 px-2.5 py-1 text-xs font-black text-white">
                                        English buddy
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {modelCatalog && (
                                    <ModelPicker
                                        models={modelCatalog.models}
                                        defaults={modelCatalog.defaults}
                                        selected={selectedModels}
                                        onChange={setSelectedModels}
                                    />
                                )}
                                <button
                                    onClick={handleNewChat}
                                    className="min-h-[44px] rounded-full border-2 border-white/30 bg-white/25 px-3 py-1.5 text-sm font-black text-white transition-colors hover:bg-white/35"
                                    title="Start new conversation"
                                >
                                    New
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/30 bg-white/25 text-lg font-black text-white transition-colors hover:bg-white/35"
                                    aria-label="Close chat"
                                >
                                    x
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div
                        className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-4"
                        style={{ background: 'linear-gradient(180deg, #F8FCFF 0%, #FFF8ED 100%)' }}
                    >
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'ai' && (
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white p-[3px] shadow-[0_4px_0_rgba(91,141,239,0.12)]">
                                        <CodexPetSprite animationState="idle" label="Lexi" size="100%" />
                                    </div>
                                )}

                                <div className="max-w-[85%] sm:max-w-[80%]">
                                    <div
                                        className={`rounded-2xl p-3 text-sm font-medium ${
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
                    <div className="border-t-2 border-sky-100 bg-white p-3">
                        <div className="flex items-end gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(event) => setInput(event.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask Lexi..."
                                className="min-h-[44px] min-w-0 flex-1 rounded-2xl border-2 border-sky-100 bg-sky-50/70 px-4 py-3 text-sm font-bold text-slate-700 placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
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
