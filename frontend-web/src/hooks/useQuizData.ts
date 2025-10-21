// src/hooks/useQuizData.ts

import { useState, useEffect } from 'react';
import type { QuizSessionData } from '../types';
import { getApiBase } from '../config';

const API_BASE = getApiBase();

/**
 * Hook to fetch quiz questions from backend
 */
export function useQuizData(qrId: string | null) {
  const [quizData, setQuizData] = useState<QuizSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!qrId) {
      setQuizData(null);
      return;
    }

    const fetchQuizData = async () => {
      console.log('📚 [useQuizData] Fetching quiz for QR:', qrId);
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/api/quiz/${qrId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('No quiz available for this flashcard');
          }
          throw new Error(`Failed to fetch quiz: ${response.statusText}`);
        }

        const data: QuizSessionData = await response.json();
        console.log('✅ [useQuizData] Quiz loaded:', data);
        setQuizData(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ [useQuizData] Error:', errorMessage);
        setError(errorMessage);
        setQuizData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizData();
  }, [qrId]);

  return { quizData, isLoading, error };
}