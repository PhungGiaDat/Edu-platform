/**
 * useChatSession — session persistence for Lexi RAG chat.
 *
 * Loads any previously saved session from AsyncStorage on mount.
 * Saves to AsyncStorage on every message change.
 *
 * The caller (ChatScreen) owns sessionId generation; this hook only
 * stores and restores it.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'lexi_chat_session';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  sources?: { word: string; score: number }[];
  agentTrace?: string[];
  timestamp: number; // Unix ms, not Date
}

export interface UseChatSessionReturn {
  sessionId: string | null;
  messages: ChatMessage[];
  isRestored: boolean; // true after loading from storage
  saveMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  /** Update sessionId (called when backend returns a new session_id) */
  setSessionId: (id: string) => void;
  reset: () => void;
}

interface StoredSession {
  sessionId: string | null;
  messages: ChatMessage[];
}

export const useChatSession = (): UseChatSessionReturn => {
  const [_sessionId, _setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRestored, setIsRestored] = useState(false);

  // Persist current state to AsyncStorage
  const persist = useCallback(async (nextMessages: ChatMessage[], sid: string | null) => {
    try {
      const stored: StoredSession = { sessionId: sid, messages: nextMessages };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch (err) {
      console.error('useChatSession: persist failed', err);
    }
  }, []);

  // On mount: load saved session from AsyncStorage
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw !== null) {
          const stored: StoredSession = JSON.parse(raw);
          _setSessionId(stored.sessionId ?? null);
          setMessages(stored.messages ?? []);
          setIsRestored(true);
        }
      } catch (err) {
        console.error('useChatSession: load failed', err);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // On every messages change: save to AsyncStorage
  useEffect(() => {
    void persist(messages, _sessionId);
  }, [messages, _sessionId, persist]);

  const saveMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
    };
    setMessages((prev) => {
      void persist([...prev, newMsg], _sessionId);
      return [...prev, newMsg];
    });
  }, [persist]);

  const reset = useCallback(async () => {
    setMessages([]);
    _setSessionId(null);
    setIsRestored(false);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('useChatSession: reset removeItem failed', err);
    }
  }, []);

  const setSessionId = useCallback((id: string) => {
    _setSessionId(id);
    void persist(messages, id);
  }, [persist, messages]);

  return {
    sessionId: _sessionId,
    messages,
    isRestored,
    saveMessage,
    setSessionId,
    reset,
  };
};
