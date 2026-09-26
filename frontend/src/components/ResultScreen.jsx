import React, { useState } from 'react';

export default function ResultScreen({ sessionResults, history, onRestart }) {
  const [showItemReview, setShowItemReview] = useState(false);

  const {
    accuracyPercent,
    speedIndex,
    averageResponseTime,
    consistencyPercent,
    difficultyClimbText,
    summary,
    correctCount,
    total
  } = sessionResults;

  const formattedAvgTime = `${averageResponseTime < 10 ? '0' : ''}${averageResponseTime.toFixed(1)}s`;

  return (
    <div className="console-wrapper">
      {/* Top Header */}
      <header className="console-topbar">
        <div className="brand-group">
          <span className="brand-symbol">■</span>
          <span className="brand-name mono">QUANTA</span>
        </div>
        <div className="system-status mono">
          <span className="status-indicator"></span>
          <span>EVALUATION COMPLETE</span>
        </div>
      </header>

      <main className="result-content">
        {/* Hero Section */}
        <section className="result-hero">
          <div className="hero-eyebrow mono">TELEMETRY DEBRIEF &bull; 06/06 QUESTIONS COMPLETED</div>
          <h1 className="hero-title">SESSION COMPLETE</h1>
          <p className="hero-subheading">Your performance under pressure</p>
        </section>

        {/* Large Key Metrics Row */}
        <div className="metrics-banner-grid">
          <div className="key-metric-card">
            <span className="key-metric-label mono">SPEED INDEX</span>
            <div className="key-metric-value mono highlight-lime" id="result-speed-index">
              {speedIndex}
            </div>
            <span className="key-metric-sub mono">Scale 0&ndash;100 vs pacing target</span>
          </div>

          <div className="key-metric-card">
            <span className="key-metric-label mono">ACCURACY</span>
            <div className="key-metric-value mono" id="result-accuracy">
              {accuracyPercent}%
            </div>
            <span className="key-metric-sub mono">{correctCount} of {total} verified correct</span>
          </div>

          <div className="key-metric-card">
            <span className="key-metric-label mono">AVG RESPONSE</span>
            <div className="key-metric-value mono" id="result-avg-response">
              {formattedAvgTime}
            </div>
            <span className="key-metric-sub mono">Browser hardware timing</span>
          </div>
        </div>

        {/* Performance Profile Horizontal Visualizer */}
        <section className="result-section">
          <h2 className="section-heading mono">PERFORMANCE PROFILE</h2>
          
          <div className="profile-bars-container">
            <div className="profile-bar-row">
              <div className="bar-meta mono">
                <span>ACCURACY</span>
                <span>{accuracyPercent}%</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill fill-lime"
                  style={{ width: `${Math.min(100, Math.max(5, accuracyPercent))}%` }}
                ></div>
              </div>
            </div>

            <div className="profile-bar-row">
              <div className="bar-meta mono">
                <span>SPEED</span>
                <span>{speedIndex}%</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill fill-speed"
                  style={{ width: `${Math.min(100, Math.max(5, speedIndex))}%` }}
                ></div>
              </div>
            </div>

            <div className="profile-bar-row">
              <div className="bar-meta mono">
                <span>CONSISTENCY</span>
                <span>{consistencyPercent}%</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill fill-consistency"
                  style={{ width: `${Math.min(100, Math.max(5, consistencyPercent))}%` }}
                ></div>
              </div>
            </div>
          </div>
        </section>

        {/* Difficulty Journey */}
        <section className="result-section">
          <div className="section-header-split">
            <h2 className="section-heading mono">DIFFICULTY JOURNEY</h2>
            <span className="climb-badge mono">{difficultyClimbText}</span>
          </div>

          <div className="journey-track" id="difficulty-journey-track">
            {history.map((item, idx) => {
              const diffClass = item.difficulty.toLowerCase();
              return (
                <React.Fragment key={idx}>
                  <div className="journey-node">
                    <span className="journey-q-num mono">Q{idx + 1}</span>
                    <span className={`journey-diff-pill ${diffClass} mono`}>
                      {item.difficulty}
                    </span>
                    <span className="journey-time mono">{item.responseTime.toFixed(1)}s</span>
                    <span className={`journey-status ${item.isCorrect ? 'status-pass' : 'status-fail'} mono`}>
                      {item.isCorrect ? 'PASS' : item.timedOut ? 'TIMEOUT' : 'FAIL'}
                    </span>
                  </div>
                  {idx < history.length - 1 && (
                    <div className="journey-arrow mono">→</div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </section>

        {/* What Happened Section */}
        <section className="result-section">
          <h2 className="section-heading mono">WHAT HAPPENED</h2>
          <div className="debrief-box">
            <p className="debrief-text">{summary}</p>
          </div>
        </section>

        {/* Question Review Accordion / Toggle */}
        <div className="review-toggle-wrapper">
          <button
            type="button"
            className="btn-secondary mono"
            onClick={() => setShowItemReview(!showItemReview)}
          >
            {showItemReview ? 'HIDE DETAILED BREAKDOWN ↑' : 'VIEW QUESTION BREAKDOWN (06) ↓'}
          </button>
        </div>

        {showItemReview && (
          <section className="detailed-breakdown-section">
            <div className="review-list">
              {history.map((h, i) => (
                <div key={i} className="review-card">
                  <div className="review-card-header mono">
                    <span>
                      Q{i + 1} &bull; {h.category} ({h.difficulty})
                    </span>
                    <span className={h.isCorrect ? 'text-success' : 'text-danger'}>
                      {h.isCorrect ? 'CORRECT' : h.timedOut ? 'TIMED OUT' : 'INCORRECT'} ({h.responseTime.toFixed(1)}s)
                    </span>
                  </div>
                  <p className="review-q-text">{h.question}</p>
                  <div className="review-options mono">
                    <div>Your response: <strong className={h.isCorrect ? 'text-success' : 'text-danger'}>
                      {h.selectedOption !== null ? `${String.fromCharCode(65 + h.selectedOption)} (${h.options[h.selectedOption]})` : 'None (Expired/Skipped)'}
                    </strong></div>
                    <div>Correct answer: <strong className="text-success">
                      {String.fromCharCode(65 + h.answer)} ({h.options[h.answer]})
                    </strong></div>
                  </div>
                  <p className="review-explanation">{h.explanation}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Restart Action Button */}
        <div className="result-actions-row">
          <button
            id="try-another-drill-btn"
            type="button"
            className="btn-primary mono"
            onClick={onRestart}
          >
            TRY ANOTHER DRILL →
          </button>
        </div>
      </main>

      <footer className="console-footer mono">
        <span>SESSION LOG SAVED LOCALLY</span>
        <span>BENCHMARK: GDG-CAMPUS-STANDARDS</span>
      </footer>
    </div>
  );
}
