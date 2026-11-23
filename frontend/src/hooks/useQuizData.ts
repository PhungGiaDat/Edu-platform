// src/hooks/useQuizData.ts

import { useState, useEffect } from 'react';
import type { GameDifficulty, QuizSessionData } from '../types';
import { getApiBase } from '../config';

const API_BASE = getApiBase();

// ── localStorage cache helpers ──────────────────────────────────────────────
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: T; ts: number };
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function setCache(key: string, data: unknown): void {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch { /* quota exceeded — ignore */ }
}
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook to fetch quiz questions from backend.
 * Serves cached data instantly (<10 min TTL), then revalidates in background.
 */
export function useQuizData(
  qrId: string | null,
  difficulty: GameDifficulty | null = null
) {
  const [quizData, setQuizData] = useState<QuizSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!qrId) {
      setQuizData(null);
      return;
    }

    const params = new URLSearchParams();
    if (difficulty) params.append('difficulty', difficulty);
    const queryString = params.toString();
    const url = `${API_BASE}/api/v1/quiz/${qrId}${queryString ? `?${queryString}` : ''}`;
    const cacheKey = `quiz:${qrId}:${difficulty ?? ''}`;

    const fetchQuizData = async (showLoading: boolean) => {
      if (showLoading) { setIsLoading(true); setError(null); }

      try {
        const response = await fetch(url, { cache: 'no-store' });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('No quiz available for this flashcard');
          }
          throw new Error(`Failed to fetch quiz: ${response.statusText}`);
        }

        const data: QuizSessionData = await response.json();
        setCache(cacheKey, data);
        setQuizData(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        // Only surface the error when there's no cached data to show
        if (!quizData) setError(errorMessage);
      } finally {
        if (showLoading) setIsLoading(false);
      }
    };

    // Serve cache immediately; skip the loading spinner if we have fresh data
    const cached = getCached<QuizSessionData>(cacheKey);
    if (cached) {
      setQuizData(cached);
      // Revalidate silently in background (no loading indicator)
      fetchQuizData(false);
    } else {
      fetchQuizData(true);
    }
  }, [qrId, difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  return { quizData, isLoading, error };
}
