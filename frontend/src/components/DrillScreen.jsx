import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QUESTION_TIMEOUT_SECONDS, FAST_THRESHOLD_SECONDS } from '../utils/adaptiveEngine';

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

  // Keyboard shortcut listener: A/B/C/D or 1/2/3/4 to select, Enter to lock
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

  const optionLetters = ['A', 'B', 'C', 'D'];
  const elapsed = QUESTION_TIMEOUT_SECONDS - timeLeft;
  const isPaceFast = elapsed <= FAST_THRESHOLD_SECONDS;

  return (
    <div className="dashboard-grid drill-active-grid">
      {/* Left + Mid: Active Question Arena */}
      <div className="grid-main-arena">
        <div className="question-card">
          {/* Header Row */}
          <div className="q-card-header">
            <div className="q-meta-group">
              <span className="q-category-tag">{question.category}</span>
              <span className={`q-difficulty-badge diff-${currentDifficulty.toLowerCase()}`}>
                {currentDifficulty}
              </span>
            </div>
            <div className="q-counter-tag mono">
              QUESTION {String(questionIndex + 1).padStart(2, '0')} / {String(totalQuestions).padStart(2, '0')}
            </div>
          </div>

          {/* Question Text */}
          <h2 className="q-title" id="active-question-text">
            {question.question}
          </h2>

          {/* Options Rows */}
          <div className="q-options-container" role="radiogroup">
            {question.options.map((opt, idx) => {
              const letter = optionLetters[idx];
              const isSelected = selectedOption === idx;

              return (
                <button
                  key={idx}
                  type="button"
                  id={`option-btn-${letter}`}
                  className={`q-option-pill ${isSelected ? 'option-selected' : ''}`}
                  onClick={() => !isLocked && setSelectedOption(idx)}
                  disabled={isLocked}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <span className="option-letter mono">{letter}</span>
                  <span className="option-text">{opt}</span>
                  {isSelected && <span className="option-badge-check">✓ READY</span>}
                </button>
              );
            })}
          </div>

          {/* Bottom Controls */}
          <div className="q-card-footer">
            <div className="progress-dots-wrap">
              {Array.from({ length: totalQuestions }).map((_, idx) => {
                let stateClass = 'dot-unanswered';
                if (idx < questionIndex) {
                  const h = history[idx];
                  stateClass = h?.isCorrect ? 'dot-correct' : 'dot-wrong';
                } else if (idx === questionIndex) {
                  stateClass = 'dot-current';
                }

                return (
                  <span
                    key={idx}
                    className={`q-dot ${stateClass}`}
                    title={`Question ${idx + 1}`}
                  />
                );
              })}
            </div>

            <div className="keyboard-tip mono">
              [KEYS A–D TO SELECT &bull; ENTER TO LOCK]
            </div>

            <div className="q-actions-group">
              <button
                type="button"
                id="skip-question-btn"
                className="btn-skip"
                onClick={handleSkipQuestion}
                disabled={isLocked}
              >
                SKIP
              </button>
              <button
                type="button"
                id="lock-answer-btn"
                className="btn-lock"
                onClick={handleConfirm}
                disabled={selectedOption === null || isLocked}
              >
                LOCK ANSWER →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Live Telemetry & Difficulty Ladder (Replacing Leaderboard) */}
      <div className="grid-right-col">
        <div className="section-card telemetry-sidebar-card">
          <div className="section-header">
            <h3 className="section-title">Adaptive Telemetry</h3>
            <span className={`live-pulse-badge ${isPaceFast ? 'pulse-fast' : ''}`}>
              {isPaceFast ? '⚡ FAST PACE' : '⏱ MODERATE'}
            </span>
          </div>

          {/* Live Difficulty Ladder */}
          <div className="ladder-container">
            <span className="ladder-label">DIFFICULTY LADDER</span>
            <div className="ladder-tiers">
              <div className={`ladder-tier-row tier-hard ${currentDifficulty === 'HARD' ? 'tier-active' : ''}`}>
                <div className="tier-indicator">▲</div>
                <div className="tier-info">
                  <span className="tier-name">HARD</span>
                  <span className="tier-sub">Complex deductions</span>
                </div>
                {currentDifficulty === 'HARD' && <span className="tier-marker">CURRENT</span>}
              </div>

              <div className={`ladder-tier-row tier-medium ${currentDifficulty === 'MEDIUM' ? 'tier-active' : ''}`}>
                <div className="tier-indicator">●</div>
                <div className="tier-info">
                  <span className="tier-name">MEDIUM</span>
                  <span className="tier-sub">Standard aptitude</span>
                </div>
                {currentDifficulty === 'MEDIUM' && <span className="tier-marker">CURRENT</span>}
              </div>

              <div className={`ladder-tier-row tier-easy ${currentDifficulty === 'EASY' ? 'tier-active' : ''}`}>
                <div className="tier-indicator">▼</div>
                <div className="tier-info">
                  <span className="tier-name">EASY</span>
                  <span className="tier-sub">Fundamental speed</span>
                </div>
                {currentDifficulty === 'EASY' && <span className="tier-marker">CURRENT</span>}
              </div>
            </div>
          </div>

          {/* Pacing Speed Dial */}
          <div className="pacing-gauge-box">
            <div className="pacing-header">
              <span>Pacing Gauge</span>
              <span className="mono">{elapsed}s / 25s</span>
            </div>
            <div className="pacing-bar-track">
              <div
                className={`pacing-bar-fill ${elapsed > FAST_THRESHOLD_SECONDS ? 'pacing-slow' : 'pacing-fast'}`}
                style={{ width: `${Math.min(100, (elapsed / QUESTION_TIMEOUT_SECONDS) * 100)}%` }}
              />
              <div
                className="threshold-marker"
                style={{ left: `${(FAST_THRESHOLD_SECONDS / QUESTION_TIMEOUT_SECONDS) * 100}%` }}
                title="8.5s Fast Threshold"
              >
                <span>8.5s</span>
              </div>
            </div>
            <div className="pacing-footer">
              <span>Fast Threshold: &le; 8.5s</span>
              <span>Timeout: 25s</span>
            </div>
          </div>

          {/* Answered Questions Telemetry mini-list */}
          <div className="session-history-mini">
            <span className="ladder-label">SESSION TRAIL</span>
            <div className="mini-trail-list">
              {history.length === 0 ? (
                <div className="empty-trail">First question in progress...</div>
              ) : (
                history.map((h, i) => (
                  <div key={i} className="mini-trail-item">
                    <span className="mini-trail-q mono">Q{i + 1}</span>
                    <span className={`mini-trail-tier diff-${h.difficulty.toLowerCase()}`}>
                      {h.difficulty}
                    </span>
                    <span className="mini-trail-time mono">{h.responseTime.toFixed(1)}s</span>
                    <span className={`mini-trail-res ${h.isCorrect ? 'res-pass' : 'res-fail'}`}>
                      {h.isCorrect ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
