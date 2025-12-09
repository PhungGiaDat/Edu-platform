// components/AIChatBuddy.tsx
/**
 * AI Chat Buddy - Floating chat bubble for kids
 * 
 * Features:
 * - Kid-friendly "Thỏ Trắng" mascot
 * - Floating bounce animation
 * - RAG-powered responses with source indicators
 * - Session-based conversation tracking
 */
import React, { useState, useRef, useEffect } from 'react';
import { ChatService, RAGChatResponse } from '../services/ChatService';

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    sources?: { word: string; score: number }[];
}

interface AIChatBuddyProps {
    userId?: string;
    initialOpen?: boolean;
}

export const AIChatBuddy: React.FC<AIChatBuddyProps> = ({ userId, initialOpen = false }) => {
    const [isOpen, setIsOpen] = useState(initialOpen);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'ai',
            content: 'Xin chào! 🐰 Mình là Thỏ Trắng, bạn học của bé! Hỏi mình bất cứ điều gì về tiếng Anh nhé! 🌟'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response: RAGChatResponse = await ChatService.sendRAGMessage(input, userId);
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: response.response,
                sources: response.sources
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error("[AIChatBuddy] Chat error:", error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: 'Ôi không! Mình gặp sự cố rồi 😅 Bạn thử lại nhé!'
            };
            setMessages(prev => [...prev, errorMsg]);
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
                content: 'Cuộc trò chuyện mới! 🌈 Hỏi mình bất cứ điều gì nhé! 🐰'
            }
        ]);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Bubble Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    fixed bottom-6 right-6 z-50
                    w-16 h-16 rounded-full
                    bg-gradient-to-br from-sky-400 to-cyan-500
                    shadow-lg shadow-cyan-500/40
                    flex items-center justify-center
                    text-3xl
                    transform transition-all duration-300
                    hover:scale-110 hover:shadow-xl
                    ${isOpen ? 'scale-90' : 'animate-breathe'}
                `}
                aria-label="Mở chat với Thỏ Trắng"
            >
                {isOpen ? '✕' : '🐰'}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div
                    className={`
                        fixed bottom-24 right-6 z-50
                        w-[90vw] max-w-[380px] h-[500px]
                        bg-gray-50
                        rounded-3xl shadow-2xl
                        border border-gray-200
                        flex flex-col overflow-hidden
                        animate-slideUp
                    `}
                    style={{ fontFamily: "'Quicksand', sans-serif" }}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-sky-400 to-cyan-500 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-3xl shadow-md">
                                🐰
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Thỏ Trắng</h3>
                                <span className="text-xs bg-white/30 text-white px-2 py-0.5 rounded-full font-medium">
                                    🟢 Sẵn sàng giúp bé
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handleNewChat}
                            className="text-white/80 hover:text-white text-sm bg-white/20 px-3 py-1.5 rounded-full font-medium hover:bg-white/30 transition-colors"
                            title="Cuộc trò chuyện mới"
                        >
                            🔄 Mới
                        </button>
                    </div>

                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {/* AI Avatar */}
                                {msg.role === 'ai' && (
                                    <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-full flex items-center justify-center text-lg shadow-sm flex-shrink-0">
                                        🐰
                                    </div>
                                )}

                                <div className="max-w-[80%]">
                                    {/* Message Bubble */}
                                    <div
                                        className={`
                                            p-3 rounded-2xl text-sm font-medium
                                            ${msg.role === 'user'
                                                ? 'bg-gradient-to-br from-amber-400 to-orange-400 text-white rounded-br-sm'
                                                : 'bg-white text-gray-700 border-2 border-amber-200 rounded-bl-sm shadow-sm'
                                            }
                                        `}
                                    >
                                        {msg.content}
                                    </div>

                                    {/* Sources Indicator (for AI messages with sources) */}
                                    {msg.role === 'ai' && msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {msg.sources.map((src, idx) => (
                                                <span
                                                    key={idx}
                                                    className="text-xs bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full"
                                                    title={`Độ liên quan: ${(src.score * 100).toFixed(0)}%`}
                                                >
                                                    📚 {src.word}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Loading Indicator */}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white p-3 rounded-2xl rounded-bl-sm border-2 border-amber-200 shadow-sm">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2.5 h-2.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2.5 h-2.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t-2 border-amber-200">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Hỏi Thỏ Trắng đi nào... 🐰"
                                className="
                                    flex-1 bg-amber-50 border-2 border-amber-200 
                                    rounded-xl px-4 py-3 
                                    focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200
                                    font-medium text-gray-700 placeholder-gray-400
                                    text-sm
                                "
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="
                                    bg-gradient-to-br from-amber-400 to-orange-500
                                    hover:from-amber-500 hover:to-orange-600
                                    text-white px-5 rounded-xl font-bold
                                    shadow-md shadow-amber-500/30
                                    transform transition-all duration-200
                                    hover:scale-105 active:scale-95
                                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                                "
                            >
                                GỬI
                            </button>
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-2">
                            Powered by AI 🤖 • Dành cho trẻ em 💚
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};

export default AIChatBuddy;
