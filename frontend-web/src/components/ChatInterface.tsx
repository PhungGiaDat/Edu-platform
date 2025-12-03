import React, { useState, useRef, useEffect } from 'react';
import { ChatService } from '../services/ChatService';

interface Message {
    id: string;
    role: 'user' | 'model';
    content: string;
}

export const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'model', content: 'Hello! I am your AI Tutor. What do you want to learn today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await ChatService.sendMessage(input);
            const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', content: response };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error("Chat error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[600px] bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-neutral-200">
            {/* Header */}
            <div className="bg-secondary p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-2xl">
                    🤖
                </div>
                <div>
                    <h3 className="text-white font-bold text-lg">AI Tutor</h3>
                    <p className="text-secondary-dark text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full inline-block">ONLINE</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-100">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium ${msg.role === 'user'
                                ? 'bg-primary text-white rounded-tr-none'
                                : 'bg-white text-neutral-800 border-2 border-neutral-200 rounded-tl-none'
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white p-4 rounded-2xl rounded-tl-none border-2 border-neutral-200">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce delay-75"></div>
                                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce delay-150"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t-2 border-neutral-200">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1 bg-neutral-100 border-2 border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:border-secondary font-medium text-neutral-800 placeholder-neutral-400"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading}
                        className="bg-secondary hover:bg-secondary-dark text-white px-6 rounded-xl font-bold border-b-4 border-secondary-dark active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        SEND
                    </button>
                </div>
            </div>
        </div>
    );
};
