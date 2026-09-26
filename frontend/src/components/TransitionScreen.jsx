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

  // Determine transition title
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
    <div className="console-wrapper transition-wrapper">
      {/* Top Header */}
      <header className="drill-topbar">
        <div className="brand-group">
          <span className="brand-symbol">■</span>
          <span className="brand-name mono">QUANTA</span>
        </div>
        <div className="drill-mode-badge mono">CALIBRATING</div>
      </header>

      <main className="transition-content">
        <div className="transition-card">
          <div className="transition-header-eyebrow mono">
            PERFORMANCE SIGNAL &bull; REAL-TIME TELEMETRY
          </div>

          <div className="transition-metrics-row">
            <div className="metric-box">
              <span className="metric-label mono">ACCURACY</span>
              <span className={`metric-val mono ${isCorrect ? 'text-success' : 'text-danger'}`}>
                {accuracyText}
              </span>
            </div>

            <div className="metric-box">
              <span className="metric-label mono">RESPONSE TIME</span>
              <span className="metric-val mono highlight-lime">
                {responseTimeText}
              </span>
            </div>
          </div>

          <div className="transition-divider"></div>

          <div className="transition-status-section">
            <span className={`transition-badge mono ${badgeClass}`}>
              {actionTitle}
            </span>

            <div className="difficulty-shift mono">
              <span className={`shift-tier ${previousDifficulty.toLowerCase()}`}>
                {previousDifficulty}
              </span>
              <span className="shift-arrow">→</span>
              <span className={`shift-tier ${nextDifficulty.toLowerCase()} highlight-tier`}>
                {nextDifficulty}
              </span>
            </div>

            <p className="transition-reason mono">{reason}</p>
          </div>

          {/* Micro countdown bar */}
          <div className="transition-progress-bar">
            <div className="transition-progress-fill"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
