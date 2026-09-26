import React, { useEffect } from 'react';

export default function TransitionScreen({ transitionData, onComplete }) {
  const {
    previousDifficulty,
    nextDifficulty,
    transitionType,
    reason,
    responseTime,
    isCorrect,
    timedOut
  } = transitionData;

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 850);

    return () => clearTimeout(timer);
  }, [onComplete]);

  let actionTitle = 'DIFFICULTY MAINTAINED';
  let badgeClass = 'tag-maintain';

  if (transitionType === 'UP') {
    actionTitle = 'DIFFICULTY UP';
    badgeClass = 'tag-up';
  } else if (transitionType === 'DOWN') {
    actionTitle = 'DIFFICULTY ADJUSTED';
    badgeClass = 'tag-down';
  }

  const accuracyText = timedOut ? 'TIMEOUT' : isCorrect ? '100%' : '0%';
  const responseTimeText = `${responseTime.toFixed(1)}s`;

  return (
    <div className="transition-modal-overlay">
      <div className="transition-dashboard-card">
        <div className="transition-card-top">
          <span className="trans-eyebrow">PERFORMANCE SIGNAL &bull; ADAPTIVE ENGINE</span>
          <span className={`trans-pill ${badgeClass}`}>{actionTitle}</span>
        </div>

        <div className="trans-metrics-grid">
          <div className="trans-metric-tile">
            <span className="trans-label">ACCURACY</span>
            <span className={`trans-val ${isCorrect ? 'val-success' : 'val-danger'} mono`}>
              {accuracyText}
            </span>
          </div>

          <div className="trans-metric-tile">
            <span className="trans-label">RESPONSE TIME</span>
            <span className="trans-val val-time mono">{responseTimeText}</span>
          </div>
        </div>

        <div className="trans-shift-display">
          <div className="shift-pill-group">
            <span className={`shift-chip diff-${previousDifficulty.toLowerCase()}`}>
              {previousDifficulty}
            </span>
            <span className="shift-arrow-icon">&rarr;</span>
            <span className={`shift-chip diff-${nextDifficulty.toLowerCase()} chip-active`}>
              {nextDifficulty}
            </span>
          </div>
          <p className="trans-reason">{reason}</p>
        </div>

        <div className="trans-progress-track">
          <div className="trans-progress-fill"></div>
        </div>
      </div>
    </div>
  );
}
