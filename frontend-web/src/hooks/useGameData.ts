// src/hooks/useGameData.ts

import { useState, useEffect } from 'react';
import type { GameSessionData, GameDifficulty, GameType } from '../types';
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
 * Hook to fetch game challenges from backend with game type filter.
 * Serves cached data instantly (<10 min TTL), then revalidates in background.
 */
export function useGameData(
  qrId: string | null,
  difficulty: GameDifficulty | null = null,
  gameType: GameType | null = null
) {
  const [gameData, setGameData] = useState<GameSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!qrId) {
      setGameData(null);
      return;
    }

    const params = new URLSearchParams();
    if (difficulty) params.append('difficulty', difficulty);
    if (gameType) params.append('game_type', gameType);
    const queryString = params.toString();
    const url = `${API_BASE}/api/v1/game/${qrId}${queryString ? `?${queryString}` : ''}`;
    const cacheKey = `game:${qrId}:${difficulty ?? ''}:${gameType ?? ''}`;

    const fetchGameData = async (showLoading: boolean) => {
      if (showLoading) { setIsLoading(true); setError(null); }

      try {
        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('No games available for this selection');
          }
          throw new Error(`Failed to fetch game: ${response.statusText}`);
        }

        const data: GameSessionData = await response.json();
        setCache(cacheKey, data);
        setGameData(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        if (!gameData) setError(errorMessage);
      } finally {
        if (showLoading) setIsLoading(false);
      }
    };

    const cached = getCached<GameSessionData>(cacheKey);
    if (cached) {
      setGameData(cached);
      fetchGameData(false);
    } else {
      fetchGameData(true);
    }
  }, [qrId, difficulty, gameType]); // eslint-disable-line react-hooks/exhaustive-deps

  return { gameData, isLoading, error };
}