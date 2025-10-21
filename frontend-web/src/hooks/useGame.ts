// src/hooks/useGame.ts

import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameSessionData, GameAnswer } from '../types';

/**
 * Hook to manage game state and logic (kid-friendly version)
 */
export function useGame(gameSession: GameSessionData | null) {
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<GameAnswer[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [totalStars, setTotalStars] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [challengeStartTime, setChallengeStartTime] = useState<number>(Date.now());
  
  // Timer (only for medium/hard)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize game
  useEffect(() => {
    if (gameSession) {
      console.log('🎮 [useGame] Game session loaded');
      setCurrentChallengeIndex(0);
      setUserAnswers([]);
      setIsFinished(false);
      setTotalStars(0);
      setIsTimedOut(false);
      setStartTime(Date.now());
      setChallengeStartTime(Date.now());
      
      // Set timer if exists
      const currentChallenge = gameSession.challenges[0];
      const timeLimit = currentChallenge?.time_limit;
      setTimeRemaining(timeLimit || null);
    }
  }, [gameSession]);

  // Countdown timer (only if time_limit exists)
  useEffect(() => {
    if (!gameSession || isFinished || isTimedOut || timeRemaining === null) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          setIsTimedOut(true);
          setIsFinished(true);
          console.log('⏰ [useGame] Time out!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameSession, isFinished, isTimedOut, timeRemaining]);

  const challenges = gameSession?.challenges || [];
  const currentChallenge = challenges[currentChallengeIndex] || null;
  const totalChallenges = challenges.length;

  /**
   * Handle answer submission (kid-friendly: no punishment)
   */
  const handleAnswer = useCallback((selectedAnswer: string) => {
    if (!currentChallenge) return;

    const timeSpent = Math.floor((Date.now() - challengeStartTime) / 1000);
    const isCorrect = selectedAnswer === currentChallenge.correct_answer;
    const starsEarned = isCorrect ? currentChallenge.stars_reward : 0;

    // Always positive: earn stars if correct, just encouragement if wrong
    if (isCorrect) {
      setTotalStars(prev => prev + starsEarned);
      console.log(`✅ [useGame] Correct! +${starsEarned} star(s)`);
    } else {
      console.log(`💪 [useGame] Try again! Keep learning!`);
    }

    const answer: GameAnswer = {
      challengeIndex: currentChallengeIndex,
      userAnswer: selectedAnswer,
      isCorrect,
      starsEarned,
      timeSpent
    };

    setUserAnswers(prev => [...prev, answer]);

    // Move to next challenge
    const nextIndex = currentChallengeIndex + 1;
    if (nextIndex < totalChallenges) {
      setCurrentChallengeIndex(nextIndex);
      setChallengeStartTime(Date.now());
      
      // Reset timer for next challenge
      const nextChallenge = challenges[nextIndex];
      const nextTimeLimit = nextChallenge.time_limit;
      setTimeRemaining(nextTimeLimit || null);
    } else {
      setIsFinished(true);
      console.log('🏁 [useGame] Game completed!');
    }
  }, [currentChallenge, currentChallengeIndex, totalChallenges, challengeStartTime, challenges]);

  /**
   * Restart game
   */
  const restartGame = useCallback(() => {
    console.log('🔄 [useGame] Restarting game');
    setCurrentChallengeIndex(0);
    setUserAnswers([]);
    setIsFinished(false);
    setTotalStars(0);
    setIsTimedOut(false);
    setStartTime(Date.now());
    setChallengeStartTime(Date.now());
    
    if (gameSession) {
      const firstChallenge = gameSession.challenges[0];
      const firstTimeLimit = firstChallenge?.time_limit;
      setTimeRemaining(firstTimeLimit || null);
    }
  }, [gameSession]);

  const totalTimeSpent = isFinished ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const correctAnswers = userAnswers.filter(a => a.isCorrect).length;

  return {
    isFinished,
    currentChallenge,
    totalChallenges,
    currentChallengeIndex,
    challenges,
    userAnswers,
    totalStars,
    correctAnswers,
    timeRemaining,
    isTimedOut,
    totalTimeSpent,
    handleAnswer,
    restartGame
  };
}