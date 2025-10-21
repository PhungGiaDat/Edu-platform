// src/components/GameOverlay.tsx

import React, { useState, useEffect } from 'react';
import { useGame } from '../hooks/useGame';
import type { GameSessionData } from '../types';
import { DragMatchGame } from './game/DragMatchGame';
import { CatchWordGame } from './game/CatchWordGame';
import { WordScrambleGame } from './game/WordScrambleGame';
import { MemoryMatchGame } from './game/MemoryMatchGame';

interface GameOverlayProps {
  gameSession: GameSessionData | null;
  onExit: () => void;
  onChangeLevel?: () => void; // Optional callback for changing level
}

/**
 * Main Game Overlay - Routes to different game types
 */
export const GameOverlay: React.FC<GameOverlayProps> = ({ gameSession, onExit }) => {
  const {
    isFinished,
    currentChallenge,
    totalChallenges,
    currentChallengeIndex,
    totalStars,
    correctAnswers,
    timeRemaining,
    isTimedOut,
    totalTimeSpent,
    handleAnswer,
    restartGame
  } = useGame(gameSession);

  const [showHint, setShowHint] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    setShowHint(false);
    setShowFeedback(false);
  }, [currentChallengeIndex]);

  const handleGameAnswer = (answer: string) => {
    if (showFeedback) return;

    // For memory match, "completed" means success
    const correct = answer === 'completed' || answer === currentChallenge?.correct_answer;
    
    setIsCorrect(correct);
    setShowFeedback(true);

    setTimeout(() => {
      handleAnswer(answer);
      setShowFeedback(false);
    }, 2500);
  };

  // Loading
  if (!gameSession) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border-4 border-pink-400">
          <div className="text-6xl animate-bounce mb-3">🎮</div>
          <p className="text-xl font-bold text-pink-600">Loading Game...</p>
        </div>
      </div>
    );
  }

  // Results
  if (isFinished) {
    const starArray = Array(totalStars).fill('⭐');
    // const gameType = gameSession.challenges[0]?.game_type || 'game';

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
        {/* Confetti */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {totalStars > 0 && [...Array(20)].map((_, i) => (
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
              {['🎉', '⭐', '✨', '🌟'][Math.floor(Math.random() * 4)]}
            </div>
          ))}
        </div>

        <div className="w-full max-w-md bg-gradient-to-br from-yellow-100 to-orange-100 backdrop-blur-md rounded-3xl shadow-2xl p-6 text-center relative border-4 border-yellow-400">
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
            <div className="bg-gradient-to-br from-yellow-200 to-orange-200 rounded-full p-4 border-4 border-yellow-400 shadow-xl">
              <div className="text-6xl animate-pulse">
                {isTimedOut ? '⏰' : totalStars >= totalChallenges * 2 ? '🏆' : totalStars > 0 ? '🌟' : '🌈'}
              </div>
            </div>
          </div>

          <div className="mt-12">
            <h2 className="text-3xl font-black text-purple-600 mb-3">
              {isTimedOut ? 'Time Up! ⏰' : totalStars > 0 ? 'Awesome! 🎉' : 'Great Try! 💪'}
            </h2>
            
            <div className="bg-white/80 rounded-2xl p-6 mb-4 shadow-inner border-4 border-yellow-300">
              <p className="text-lg font-bold text-gray-700 mb-3">Stars Earned:</p>
              <div className="flex flex-wrap justify-center gap-2 mb-3">
                {starArray.map((star, i) => (
                  <span key={i} className="text-5xl animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>
                    {star}
                  </span>
                ))}
                {totalStars === 0 && <span className="text-4xl">🌈</span>}
              </div>
              <p className="text-4xl font-black text-orange-600">{totalStars} Star{totalStars !== 1 ? 's' : ''}!</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-blue-100 rounded-2xl p-3 border-4 border-blue-300">
                <p className="text-sm font-bold text-blue-700">Correct</p>
                <p className="text-3xl font-black text-blue-600">{correctAnswers}/{totalChallenges}</p>
              </div>
              <div className="bg-green-100 rounded-2xl p-3 border-4 border-green-300">
                <p className="text-sm font-bold text-green-700">Time</p>
                <p className="text-3xl font-black text-green-600">{totalTimeSpent}s</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={restartGame}
                className="px-8 py-4 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 rounded-2xl text-white font-black text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg border-4 border-green-600"
              >
                🔄 Play Again!
              </button>
              <button
                onClick={onExit}
                className="px-8 py-4 bg-gradient-to-r from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 rounded-2xl text-white font-black text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg border-4 border-purple-600"
              >
                ← Back to Learning
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentChallenge) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm">
        <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border-4 border-red-400 text-center max-w-xs">
          <div className="text-6xl mb-3">😢</div>
          <p className="text-xl font-bold text-red-600 mb-3">No games yet!</p>
          <button onClick={onExit} className="px-5 py-2 bg-blue-500 hover:bg-blue-600 rounded-2xl text-white font-bold">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Active game
  const hasTimer = timeRemaining !== null;
  const getTimerColor = () => {
    if (!hasTimer || timeRemaining === null) return 'from-gray-400 to-gray-500';
    if (timeRemaining <= 10) return 'from-red-500 to-red-600 animate-pulse';
    if (timeRemaining <= 20) return 'from-orange-500 to-orange-600';
    return 'from-green-500 to-green-600';
  };

  // Render appropriate game component
  const renderGame = () => {
    const props = {
      challenge: currentChallenge,
      onAnswer: handleGameAnswer,
      showHint
    };

    switch (currentChallenge.game_type) {
      case 'drag_match':
        return <DragMatchGame {...props} />;
      case 'catch_word':
        return <CatchWordGame {...props} />;
      case 'word_scramble':
        return <WordScrambleGame {...props} />;
      case 'memory_match':
        return <MemoryMatchGame {...props} />;
      default:
        return <div>Unknown game type</div>;
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-xl my-auto">
        {/* Top Bar */}
        <div className="mb-3 flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 backdrop-blur-sm rounded-full border-2 border-white shadow-lg">
            <span className="text-2xl">⭐</span>
            <span className="text-xl font-black text-white drop-shadow-lg">{totalStars}</span>
          </div>

          {hasTimer && timeRemaining !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${getTimerColor()} backdrop-blur-sm rounded-full border-2 border-white shadow-lg`}>
              <span className="text-2xl">⏱️</span>
              <span className="text-lg md:text-xl font-black text-white drop-shadow-lg">
                {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
              </span>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm md:text-base font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] bg-purple-500/90 backdrop-blur-sm px-3 py-1 rounded-full border-2 border-white">
              Challenge {currentChallengeIndex + 1}/{totalChallenges}
            </span>
            <span className="text-sm md:text-base font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] bg-pink-500/90 backdrop-blur-sm px-3 py-1 rounded-full border-2 border-white">
              {currentChallenge.game_type.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div className="w-full bg-white/80 backdrop-blur-sm rounded-full h-4 border-2 border-pink-400 shadow-lg overflow-hidden">
            <div
              className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-500 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-1"
              style={{ width: `${((currentChallengeIndex + 1) / totalChallenges) * 100}%` }}
            >
              <span className="text-xs">🚀</span>
            </div>
          </div>
        </div>

        {/* Game Card */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 backdrop-blur-md rounded-3xl shadow-2xl p-4 md:p-6 border-4 border-blue-300 relative">
          <div className="absolute -top-3 -left-3 text-4xl rotate-12 drop-shadow-lg animate-bounce">🎮</div>
          <div className="absolute -top-3 -right-3 text-4xl -rotate-12 drop-shadow-lg animate-bounce" style={{ animationDelay: '0.5s' }}>🎯</div>

          <div className="mb-4 text-center">
            <h2 className="text-xl md:text-2xl font-black text-purple-700 drop-shadow-sm">
              {currentChallenge.question}
            </h2>
          </div>

          {/* Hint button (not for memory match) */}
          {currentChallenge.hint && currentChallenge.game_type !== 'memory_match' && (
            <div className="mb-4 text-center">
              <button
                onClick={() => setShowHint(!showHint)}
                className="px-4 py-2 bg-gradient-to-r from-yellow-300 to-orange-300 hover:from-yellow-400 hover:to-orange-400 rounded-full text-purple-700 font-bold text-sm shadow-lg border-2 border-yellow-500 transition-all transform hover:scale-105"
              >
                {showHint ? '🔍 Hide Hint' : '💡 Need Help?'}
              </button>
            </div>
          )}

          {/* Render game */}
          {renderGame()}

          {/* Feedback */}
          {showFeedback && (
            <div className={`mt-4 p-4 rounded-2xl border-4 ${isCorrect ? 'bg-green-100 border-green-400' : 'bg-orange-100 border-orange-400'} animate-fadeIn`}>
              <div className="flex items-start gap-3">
                <div className="text-4xl flex-shrink-0">
                  {isCorrect ? '🎉' : '💪'}
                </div>
                <div>
                  <p className="font-black text-xl text-gray-800">
                    {isCorrect 
                      ? (currentChallenge.celebration_right || 'Amazing! 🌟')
                      : (currentChallenge.encouragement_wrong || 'Good try! Keep going! 💪')
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Exit */}
        <div className="mt-3 text-center">
          <button
            onClick={onExit}
            className="px-5 py-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full text-purple-600 font-bold text-sm shadow-lg border-2 border-purple-400 transition-all transform hover:scale-105 drop-shadow-md"
          >
            ← Exit Game
          </button>
        </div>
      </div>
    </div>
  );
};