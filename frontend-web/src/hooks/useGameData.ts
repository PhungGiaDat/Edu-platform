// src/hooks/useGameData.ts

import { useState, useEffect } from 'react';
import type { GameSessionData, GameDifficulty, GameType } from '../types';
import { getApiBase } from '../config';

const API_BASE = getApiBase();

/**
 * Hook to fetch game challenges from backend with game type filter
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

    const fetchGameData = async () => {
      console.log('🎮 [useGameData] Fetching:', { qrId, difficulty, gameType });
      setIsLoading(true);
      setError(null);

      try {
        // Build query params
        const params = new URLSearchParams();
        if (difficulty) params.append('difficulty', difficulty);
        if (gameType) params.append('game_type', gameType);
        
        const queryString = params.toString();
        const url = `${API_BASE}/api/game/${qrId}${queryString ? `?${queryString}` : ''}`;
        
        console.log('📡 [useGameData] URL:', url);
        const response = await fetch(url);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('No games available for this selection');
          }
          throw new Error(`Failed to fetch game: ${response.statusText}`);
        }

        const data: GameSessionData = await response.json();
        console.log('✅ [useGameData] Game loaded:', data);
        setGameData(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ [useGameData] Error:', errorMessage);
        setError(errorMessage);
        setGameData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameData();
  }, [qrId, difficulty, gameType]);

  return { gameData, isLoading, error };
}