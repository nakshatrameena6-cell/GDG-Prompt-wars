import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QUESTION_TIMEOUT_SECONDS } from '../utils/adaptiveEngine';

export default function DrillScreen({
  questionIndex,
  totalQuestions,
  currentDifficulty,
  question,
  history,
  onAnswer,
  onSkip
}) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIMEOUT_SECONDS);
  const [isLocked, setIsLocked] = useState(false);

  const startTimeRef = useRef(performance.now());
  const timerRef = useRef(null);

  // Reset state when new question arrives
  useEffect(() => {
    setSelectedOption(null);
    setIsLocked(false);
    setTimeLeft(QUESTION_TIMEOUT_SECONDS);
    startTimeRef.current = performance.now();

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = interval;

    return () => clearInterval(interval);
  }, [question.id]);

  // Handle timeout (auto submit as unanswered)
  const handleTimeout = useCallback(() => {
    if (isLocked) return;
    setIsLocked(true);
    if (timerRef.current) clearInterval(timerRef.current);

    onAnswer({
      question,
      selectedOption: null,
      isCorrect: false,
      responseTime: QUESTION_TIMEOUT_SECONDS,
      timedOut: true
    });
  }, [isLocked, onAnswer, question]);

  useEffect(() => {
    if (timeLeft === 0 && !isLocked) {
      handleTimeout();
    }
  }, [timeLeft, isLocked, handleTimeout]);

  // Handle Lock Answer submission
  const handleConfirm = useCallback(() => {
    if (selectedOption === null || isLocked) return;
    setIsLocked(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const now = performance.now();
    const elapsed = Math.min(
      QUESTION_TIMEOUT_SECONDS,
      Math.max(0.2, (now - startTimeRef.current) / 1000)
    );
    const responseTime = Number(elapsed.toFixed(1));
    const isCorrect = selectedOption === question.answer;

    onAnswer({
      question,
      selectedOption,
      isCorrect,
      responseTime,
      timedOut: false
    });
  }, [selectedOption, isLocked, onAnswer, question]);

  // Handle skip
  const handleSkipQuestion = useCallback(() => {
    if (isLocked) return;
    setIsLocked(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const now = performance.now();
    const elapsed = Math.min(
      QUESTION_TIMEOUT_SECONDS,
      Math.max(0.5, (now - startTimeRef.current) / 1000)
    );

    onSkip({
      question,
      selectedOption: null,
      isCorrect: false,
      responseTime: Number(elapsed.toFixed(1)),
      skipped: true
    });
  }, [isLocked, onSkip, question]);

  // Keyboard shortcut listener: A/B/C/D or 1/2/3/4 to select, Enter to lock, S to skip
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isLocked) return;

      const key = e.key.toUpperCase();
      let optionIdx = null;

      if (key === 'A' || key === '1') optionIdx = 0;
      else if (key === 'B' || key === '2') optionIdx = 1;
      else if (key === 'C' || key === '3') optionIdx = 2;
      else if (key === 'D' || key === '4') optionIdx = 3;

      if (optionIdx !== null && optionIdx < question.options.length) {
        e.preventDefault();
        setSelectedOption(optionIdx);
      } else if (key === 'ENTER') {
        e.preventDefault();
        if (selectedOption !== null) {
          handleConfirm();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, selectedOption, question.options.length, handleConfirm]);

  const formattedTime = `00:${String(timeLeft).padStart(2, '0')}`;
  const formattedIndex = `${String(questionIndex + 1).padStart(2, '0')} / ${String(totalQuestions).padStart(2, '0')}`;

  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="console-wrapper">
      {/* Top Bar */}
      <header className="drill-topbar">
        <div className="brand-group">
          <span className="brand-symbol">■</span>
          <span className="brand-name mono">QUANTA</span>
        </div>

        <div className="drill-mode-badge mono">SPEED DRILL</div>

        <div className="question-counter mono" id="drill-counter">
          {formattedIndex}
        </div>
      </header>

      {/* Difficulty Telemetry Track */}
      <div className="telemetry-bar">
        <div className="difficulty-track-wrapper">
          <span className="telemetry-label mono">DIFFICULTY</span>
          <div className="difficulty-track">
            <span className={`diff-node ${currentDifficulty === 'EASY' ? 'active-easy' : ''} mono`}>
              EASY
            </span>
            <span className="diff-divider">─────────</span>
            <span className={`diff-node ${currentDifficulty === 'MEDIUM' ? 'active-medium' : ''} mono`}>
              MEDIUM
            </span>
            <span className="diff-divider">─────────</span>
            <span className={`diff-node ${currentDifficulty === 'HARD' ? 'active-hard' : ''} mono`}>
              HARD
            </span>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="timer-wrapper">
          <span className="timer-label mono">TIME REMAINING</span>
          <div className={`countdown-display mono ${timeLeft <= 5 ? 'timer-critical' : ''}`} id="question-timer">
            {formattedTime}
          </div>
        </div>
      </div>

      {/* Main Question Body */}
      <main className="question-container">
        <div className="question-category-tag mono">
          {question.category.toUpperCase()} &bull; {currentDifficulty}
        </div>

        <h2 className="question-text" id="active-question-text">
          {question.question}
        </h2>

        {/* Options List */}
        <div className="options-grid" role="radiogroup">
          {question.options.map((opt, idx) => {
            const letter = optionLetters[idx];
            const isSelected = selectedOption === idx;

            return (
              <button
                key={idx}
                type="button"
                id={`option-btn-${letter}`}
                className={`option-row ${isSelected ? 'selected' : ''}`}
                onClick={() => !isLocked && setSelectedOption(idx)}
                disabled={isLocked}
                role="radio"
                aria-checked={isSelected}
              >
                <span className="option-badge mono">{letter}</span>
                <span className="option-label">{opt}</span>
                {isSelected && <span className="option-checked-mark mono">SELECTED</span>}
              </button>
            );
          })}
        </div>
      </main>

      {/* Bottom Control Bar */}
      <footer className="drill-bottom-bar">
        {/* Progress Dots */}
        <div className="progress-dots" aria-label="Progress tracker">
          {Array.from({ length: totalQuestions }).map((_, idx) => {
            let stateClass = 'unanswered';
            if (idx < questionIndex) {
              const h = history[idx];
              stateClass = h?.isCorrect ? 'dot-correct' : 'dot-wrong';
            } else if (idx === questionIndex) {
              stateClass = 'dot-current';
            }

            return (
              <span
                key={idx}
                className={`dot-indicator ${stateClass}`}
                title={`Question ${idx + 1}`}
              />
            );
          })}
        </div>

        {/* Keyboard Helper */}
        <div className="keyboard-helper mono">
          [KEYS A&ndash;D TO SELECT &bull; ENTER TO LOCK]
        </div>

        {/* Actions */}
        <div className="drill-actions">
          <button
            type="button"
            id="skip-question-btn"
            className="btn-secondary mono"
            onClick={handleSkipQuestion}
            disabled={isLocked}
          >
            SKIP
          </button>
          <button
            type="button"
            id="lock-answer-btn"
            className="btn-primary mono"
            onClick={handleConfirm}
            disabled={selectedOption === null || isLocked}
          >
            LOCK ANSWER
          </button>
        </div>
      </footer>
    </div>
  );
}
