import React, { useState, useCallback } from 'react';
import { QUESTION_BANK } from './data/questions';
import {
  calculateNextDifficulty,
  computeSessionResults,
  TOTAL_QUESTIONS_PER_DRILL
} from './utils/adaptiveEngine';
import StartScreen from './components/StartScreen';
import DrillScreen from './components/DrillScreen';
import TransitionScreen from './components/TransitionScreen';
import ResultScreen from './components/ResultScreen';
import './App.css';

export default function App() {
  // Screen state: 'START' | 'DRILL' | 'TRANSITION' | 'RESULT'
  const [screen, setScreen] = useState('START');

  // Drill state
  const [currentDifficulty, setCurrentDifficulty] = useState('MEDIUM');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [usedQuestionIds, setUsedQuestionIds] = useState(new Set());
  const [history, setHistory] = useState([]);
  const [pendingTransition, setPendingTransition] = useState(null);
  const [sessionResults, setSessionResults] = useState(null);

  /**
   * Helper to pick an unused question matching the requested difficulty.
   * If exhausted, fall back to closest available difficulty.
   */
  const pickNextQuestion = useCallback((targetDifficulty, excludedIds) => {
    // 1. Try exact difficulty match
    let candidates = QUESTION_BANK.filter(
      q => q.difficulty === targetDifficulty && !excludedIds.has(q.id)
    );

    // 2. Fallback to any unused question if needed
    if (candidates.length === 0) {
      candidates = QUESTION_BANK.filter(q => !excludedIds.has(q.id));
    }

    // 3. Fallback to entire bank if all exhausted
    if (candidates.length === 0) {
      candidates = QUESTION_BANK;
    }

    // Pick first candidate or random
    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
  }, []);

  // Initialize and begin a fresh drill session
  const handleStartDrill = () => {
    const startingDifficulty = 'MEDIUM';
    const firstQuestion = pickNextQuestion(startingDifficulty, new Set());

    setCurrentDifficulty(startingDifficulty);
    setCurrentQuestion(firstQuestion);
    setQuestionIndex(0);
    setUsedQuestionIds(new Set([firstQuestion.id]));
    setHistory([]);
    setPendingTransition(null);
    setSessionResults(null);
    setScreen('DRILL');
  };

  // Process user answer or timeout
  const handleProcessAnswer = useCallback((answerData) => {
    const { question, selectedOption, isCorrect, responseTime, timedOut, skipped } = answerData;

    // Calculate adaptive transition
    const adaptiveResult = calculateNextDifficulty(currentDifficulty, isCorrect, responseTime);

    const record = {
      questionId: question.id,
      category: question.category,
      difficulty: currentDifficulty,
      question: question.question,
      options: question.options,
      answer: question.answer,
      explanation: question.explanation,
      selectedOption,
      isCorrect,
      responseTime,
      timedOut: !!timedOut,
      skipped: !!skipped,
      nextDifficulty: adaptiveResult.nextDifficulty
    };

    const newHistory = [...history, record];
    setHistory(newHistory);

    const transitionPayload = {
      ...adaptiveResult,
      responseTime,
      isCorrect,
      timedOut: !!timedOut,
      isFinalQuestion: newHistory.length >= TOTAL_QUESTIONS_PER_DRILL
    };

    setPendingTransition(transitionPayload);
    setScreen('TRANSITION');
  }, [currentDifficulty, history]);

  // Transition interstitial completed -> show next question or final results
  const handleTransitionComplete = useCallback(() => {
    if (!pendingTransition) return;

    if (pendingTransition.isFinalQuestion) {
      // Calculate final results
      const results = computeSessionResults(history);
      setSessionResults(results);
      setScreen('RESULT');
    } else {
      const nextDiff = pendingTransition.nextDifficulty;
      setCurrentDifficulty(nextDiff);

      const nextQ = pickNextQuestion(nextDiff, usedQuestionIds);
      setCurrentQuestion(nextQ);
      setUsedQuestionIds(prev => new Set([...prev, nextQ.id]));
      setQuestionIndex(prev => prev + 1);
      setScreen('DRILL');
    }
  }, [history, pendingTransition, pickNextQuestion, usedQuestionIds]);

  // Reset session and restart
  const handleRestart = () => {
    setScreen('START');
  };

  return (
    <div className="app-viewport">
      {screen === 'START' && (
        <StartScreen onStart={handleStartDrill} />
      )}

      {screen === 'DRILL' && currentQuestion && (
        <DrillScreen
          questionIndex={questionIndex}
          totalQuestions={TOTAL_QUESTIONS_PER_DRILL}
          currentDifficulty={currentDifficulty}
          question={currentQuestion}
          history={history}
          onAnswer={handleProcessAnswer}
          onSkip={handleProcessAnswer}
        />
      )}

      {screen === 'TRANSITION' && pendingTransition && (
        <TransitionScreen
          transitionData={pendingTransition}
          onComplete={handleTransitionComplete}
        />
      )}

      {screen === 'RESULT' && sessionResults && (
        <ResultScreen
          sessionResults={sessionResults}
          history={history}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
