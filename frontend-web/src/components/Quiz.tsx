// src/components/QuizOverlay.tsx

import React, { useState, useEffect } from 'react';
import { useQuiz } from '../hooks/useQuiz';
import type { QuizSessionData } from '../types';
import { getApiBase } from '../config';
import '../styles/Overlays.css';

const API_BASE = getApiBase();

interface QuizOverlayProps {
  quizSession: QuizSessionData | null;
  onExit: () => void;
}

export const QuizOverlay: React.FC<QuizOverlayProps> = ({ quizSession, onExit }) => {
  const {
    isFinished,
    currentQuestion,
    totalQuestions,
    currentQuestionIndex,
    score,
    totalTimeSpent,
    handleAnswer,
    restartQuiz,
    timeRemaining,
    lives,
    isTimedOut
  } = useQuiz(quizSession);

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    setSelectedAnswer(null);
    setShowFeedback(false);
    setIsCorrect(false);
  }, [currentQuestionIndex]);

  const handleAnswerClick = (answer: string) => {
    if (showFeedback) return;

    const correct = answer === currentQuestion?.correct_answer;
    
    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setShowFeedback(true);

    setTimeout(() => {
      handleAnswer(answer);
      setShowFeedback(false);
      setSelectedAnswer(null);
    }, 3000);
  };

  // Loading state
  if (!quizSession) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border-4 border-purple-400">
          <div className="text-6xl animate-bounce mb-3">🎈</div>
          <p className="text-xl font-bold text-purple-600">Loading Quiz...</p>
        </div>
      </div>
    );
  }

  // Quiz completed or timeout
  if (isFinished) {
    const percentage = Math.round((score / totalQuestions) * 100);
    const passingScore = quizSession.passing_score || Math.ceil(totalQuestions * 0.7);
    const isPassed = score >= passingScore;
    const isGameOver = lives <= 0;

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
        {/* Confetti or Game Over effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {isPassed && !isTimedOut && !isGameOver && [...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute text-3xl animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              {['🎉', '⭐', '✨'][Math.floor(Math.random() * 3)]}
            </div>
          ))}
        </div>

        <div className="w-full max-w-sm bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6 text-center relative border-4 border-yellow-400">
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
            <div className="bg-white/95 backdrop-blur-md rounded-full p-3 border-4 border-yellow-400 shadow-xl">
              <div className="text-5xl">
                {isTimedOut ? '⏰' : isGameOver ? '☠️' : isPassed ? '🏆' : '🌈'}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-2xl font-black text-purple-600 mb-2">
              {isTimedOut ? 'Time Out! ⏰' : isGameOver ? 'Game Over! 💔' : isPassed ? 'Amazing! 🎉' : 'Great Try! 💪'}
            </h2>
            
            <div className="bg-gradient-to-r from-yellow-300 to-orange-300 rounded-2xl p-4 mb-3 shadow-lg">
              <p className="text-5xl font-black text-white drop-shadow-lg">
                {score} / {totalQuestions}
              </p>
            </div>

            <div className="flex justify-center gap-1 mb-3">
              {[...Array(totalQuestions)].map((_, i) => (
                <span key={i} className="text-3xl">
                  {i < score ? '⭐' : '☆'}
                </span>
              ))}
            </div>

            <p className="text-xl font-bold text-pink-600 mb-1">{percentage}%</p>
            <p className="text-sm text-gray-600 font-semibold">
              {isTimedOut ? '⏰ Time ran out!' : `⏱️ Time: ${totalTimeSpent}s`}
            </p>
            
            {/* Show remaining lives */}
            {isGameOver && (
              <p className="text-sm text-red-600 font-bold mt-2">
                💔 No lives remaining!
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={restartQuiz}
              className="px-6 py-3 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 rounded-2xl text-white font-bold text-base transition-all transform hover:scale-105 active:scale-95 shadow-lg border-4 border-green-600"
            >
              🔄 Try Again
            </button>
            <button
              onClick={onExit}
              className="px-6 py-3 bg-gradient-to-r from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 rounded-2xl text-white font-bold text-base transition-all transform hover:scale-105 active:scale-95 shadow-lg border-4 border-purple-600"
            >
              ← Back to AR
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm">
        <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border-4 border-red-400 text-center max-w-xs">
          <div className="text-6xl mb-3">😢</div>
          <p className="text-xl font-bold text-red-600 mb-3">No questions!</p>
          <button
            onClick={onExit}
            className="px-5 py-2 bg-blue-500 hover:bg-blue-600 rounded-2xl text-white font-bold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Timer color based on urgency
  const getTimerColor = () => {
    if (timeRemaining <= 10) return 'from-red-500 to-red-600 animate-pulse';
    if (timeRemaining <= 20) return 'from-orange-500 to-orange-600';
    return 'from-green-500 to-green-600';
  };

  // Active quiz
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-xl my-auto">
        {/* Timer and Lives - Top Bar */}
        <div className="mb-3 flex justify-between items-center gap-2">
          {/* Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${getTimerColor()} backdrop-blur-sm rounded-full border-2 border-white shadow-lg`}>
            <span className="text-2xl">⏱️</span>
            <span className="text-lg md:text-xl font-black text-white drop-shadow-lg">
              {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
            </span>
          </div>

          {/* Lives */}
          <div className="flex items-center gap-1 px-4 py-2 bg-red-500/90 backdrop-blur-sm rounded-full border-2 border-white shadow-lg">
            {[...Array(3)].map((_, i) => (
              <span key={i} className="text-2xl">
                {i < lives ? '❤️' : '🖤'}
              </span>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm md:text-base font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] bg-purple-500/90 backdrop-blur-sm px-3 py-1 rounded-full border-2 border-white">
              Question {currentQuestionIndex + 1} / {totalQuestions}
            </span>
            <span className="text-sm md:text-base font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] bg-pink-500/90 backdrop-blur-sm px-3 py-1 rounded-full border-2 border-white">
              {Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%
            </span>
          </div>
          <div className="w-full bg-white/80 backdrop-blur-sm rounded-full h-4 border-2 border-yellow-400 shadow-lg overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-400 via-blue-400 to-purple-500 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-1"
              style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
            >
              <span className="text-xs">🚀</span>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-4 md:p-6 border-4 border-yellow-300 relative">
          <div className="absolute -top-3 -left-3 text-4xl rotate-12 drop-shadow-lg">🌟</div>
          <div className="absolute -top-3 -right-3 text-4xl -rotate-12 drop-shadow-lg">✨</div>

          <div className="mb-3 flex justify-center">
            <span className="inline-flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full text-white font-bold text-xs md:text-sm uppercase shadow-lg">
              {currentQuestion.type === 'multiple_choice' ? '📝 MULTIPLE' : '✓ TRUE/FALSE'}
            </span>
          </div>

          {currentQuestion.image_url && (
            <div className="mb-4 rounded-2xl overflow-hidden shadow-xl border-4 border-blue-300">
              <img
                src={`${API_BASE}${currentQuestion.image_url}`}
                alt="Question"
                className="w-full h-32 md:h-40 object-cover"
              />
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 mb-4 border-4 border-blue-300 shadow-inner">
            <h2 className="text-base md:text-xl font-black text-purple-800 leading-snug text-center drop-shadow-sm">
              {currentQuestion.question_text}
            </h2>
          </div>

          <div className={`grid ${currentQuestion.type === 'true_false' ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-3 mb-4`}>
            {currentQuestion.options.map((option, index) => {
              const colors = [
                'from-red-400 to-pink-500 border-red-600',
                'from-blue-400 to-cyan-500 border-blue-600',
                'from-green-400 to-emerald-500 border-green-600',
                'from-yellow-400 to-orange-500 border-yellow-600'
              ];

              let buttonClass = `p-3 md:p-4 bg-gradient-to-br ${colors[index]} rounded-2xl text-white font-bold text-sm md:text-base transition-all transform shadow-lg border-4 relative overflow-hidden`;
              
              if (showFeedback) {
                const isThisCorrect = option === currentQuestion.correct_answer;
                const isThisSelected = option === selectedAnswer;

                if (isThisCorrect) {
                  buttonClass = 'p-3 md:p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl text-white font-bold text-sm md:text-base border-4 border-green-700 shadow-2xl scale-105 animate-pulse';
                } else if (isThisSelected && !isCorrect) {
                  buttonClass = 'p-3 md:p-4 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl text-white font-bold text-sm md:text-base border-4 border-red-800 shadow-2xl scale-105';
                } else {
                  buttonClass += ' opacity-50';
                }
              } else {
                buttonClass += ' hover:scale-105 active:scale-95 cursor-pointer';
              }
              
              return (
                <button
                  key={index}
                  onClick={() => handleAnswerClick(option)}
                  disabled={showFeedback}
                  className={buttonClass}
                >
                  <span className="block text-xs font-black mb-1 opacity-90">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span className="drop-shadow-md">{option}</span>
                  
                  {showFeedback && option === currentQuestion.correct_answer && (
                    <div className="absolute top-1 right-1 text-3xl animate-bounce">✅</div>
                  )}
                  {showFeedback && option === selectedAnswer && !isCorrect && (
                    <div className="absolute top-1 right-1 text-3xl">❌</div>
                  )}
                </button>
              );
            })}
          </div>

          {showFeedback && currentQuestion.explanation && (
            <div className={`p-4 rounded-2xl border-4 ${isCorrect ? 'bg-green-50 border-green-400' : 'bg-orange-50 border-orange-400'} animate-fadeIn`}>
              <div className="flex items-start gap-3">
                <div className="text-3xl flex-shrink-0">
                  {isCorrect ? '🎉' : '💡'}
                </div>
                <div>
                  <p className="font-bold text-lg mb-1 text-gray-800">
                    {isCorrect ? 'Correct!' : 'Not quite!'}
                  </p>
                  <p className="text-sm md:text-base text-gray-700 font-semibold">
                    {currentQuestion.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 text-center">
          <button
            onClick={onExit}
            className="px-5 py-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full text-purple-600 font-bold text-sm shadow-lg border-2 border-purple-400 transition-all transform hover:scale-105 drop-shadow-md"
          >
            ← Exit
          </button>
        </div>
      </div>
    </div>
  );
};