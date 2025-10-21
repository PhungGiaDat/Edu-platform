// src/hooks/useQuiz.ts

import { useState, useCallback, useEffect, useRef } from 'react';
import type { QuizSessionData, QuizAnswer } from '../types';

/**
 * Hook to manage quiz state and logic with timer and lives system
 */
export function useQuiz(quizSession: QuizSessionData | null) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<QuizAnswer[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  
  // ========== NEW: Timer and Lives ==========
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [lives, setLives] = useState<number>(3); // Start with 3 hearts
  const [isTimedOut, setIsTimedOut] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize timer when quiz starts
  useEffect(() => {
    if (quizSession) {
      console.log('🎮 [useQuiz] New quiz session loaded');
      setCurrentQuestionIndex(0);
      setUserAnswers([]);
      setIsFinished(false);
      setStartTime(Date.now());
      setQuestionStartTime(Date.now());
      setLives(3);
      setIsTimedOut(false);
      
      // Set initial time from quizSession
      const initialTime = quizSession.time_limit || 60;
      setTimeRemaining(initialTime);
      
      console.log(`⏱️ [useQuiz] Timer started: ${initialTime} seconds`);
    }
  }, [quizSession]);

  // Countdown timer
  useEffect(() => {
    if (!quizSession || isFinished || isTimedOut) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    // Start countdown
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsTimedOut(true);
          setIsFinished(true);
          console.log('⏰ [useQuiz] Time out!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [quizSession, isFinished, isTimedOut]);

  const questions = quizSession?.questions || [];
  const currentQuestion = questions[currentQuestionIndex] || null;
  const totalQuestions = questions.length;

  /**
   * Handle user answer submission with lives system
   */
  const handleAnswer = useCallback((selectedAnswer: string) => {
    if (!currentQuestion) return;

    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const isCorrect = selectedAnswer === currentQuestion.correct_answer;

    // ========== NEW: Lives system ==========
    if (!isCorrect) {
      const newLives = lives - 1;
      setLives(newLives);
      console.log(`💔 [useQuiz] Wrong answer! Lives remaining: ${newLives}`);
      
      // Game over if no lives left
      if (newLives <= 0) {
        console.log('☠️ [useQuiz] No lives left - Game Over!');
        setIsFinished(true);
        return;
      }
    }

    const answer: QuizAnswer = {
      questionId: currentQuestion.id,
      userAnswer: selectedAnswer,
      isCorrect,
      timeSpent
    };

    console.log('✅ [useQuiz] Answer:', {
      question: currentQuestion.question_text,
      selected: selectedAnswer,
      correct: currentQuestion.correct_answer,
      isCorrect
    });

    const newAnswers = [...userAnswers, answer];
    setUserAnswers(newAnswers);

    // Move to next question or finish
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < totalQuestions) {
      setCurrentQuestionIndex(nextIndex);
      setQuestionStartTime(Date.now());
    } else {
      setIsFinished(true);
      console.log('🏁 [useQuiz] Quiz completed!');
    }
  }, [currentQuestion, currentQuestionIndex, totalQuestions, userAnswers, questionStartTime, lives]);

  /**
   * Calculate score
   */
  const score = userAnswers.filter(answer => answer.isCorrect).length;

  /**
   * Calculate total time spent
   */
  const totalTimeSpent = isFinished ? Math.floor((Date.now() - startTime) / 1000) : 0;

  /**
   * Restart quiz
   */
  const restartQuiz = useCallback(() => {
    console.log('🔄 [useQuiz] Restarting quiz');
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setIsFinished(false);
    setStartTime(Date.now());
    setQuestionStartTime(Date.now());
    setLives(3);
    setIsTimedOut(false);
    
    // Reset timer
    const initialTime = quizSession?.time_limit || 60;
    setTimeRemaining(initialTime);
  }, [quizSession]);

  return {
    isFinished,
    currentQuestion,
    totalQuestions,
    currentQuestionIndex,
    questions,
    userAnswers,
    score,
    totalTimeSpent,
    handleAnswer,
    restartQuiz,
    
    // ========== NEW: Timer and Lives ==========
    timeRemaining,
    lives,
    isTimedOut
  };    
}