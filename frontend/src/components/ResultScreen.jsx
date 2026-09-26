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
    <div className="dashboard-grid result-active-grid">
      {/* Left + Mid: Comprehensive Results */}
      <div className="grid-main-arena">
        {/* Results Hero Card */}
        <div className="section-card result-hero-card">
          <div className="result-hero-header">
            <div>
              <span className="card-eyebrow">TELEMETRY DEBRIEF &bull; 06/06 COMPLETED</span>
              <h2 className="result-main-title">Session Complete</h2>
              <p className="result-sub-title">Your placement performance under pressure</p>
            </div>
            <div className="result-badge-tier">
              <span>{difficultyClimbText}</span>
            </div>
          </div>

          {/* Performance Profile Visualizer */}
          <div className="profile-bars-box">
            <h4 className="profile-heading">PERFORMANCE PROFILE</h4>
            <div className="profile-bar-row">
              <div className="profile-meta">
                <span>Accuracy Rate</span>
                <span className="mono">{accuracyPercent}%</span>
              </div>
              <div className="profile-track">
                <div className="profile-fill fill-green" style={{ width: `${accuracyPercent}%` }}></div>
              </div>
            </div>

            <div className="profile-bar-row">
              <div className="profile-meta">
                <span>Speed Index</span>
                <span className="mono">{speedIndex}%</span>
              </div>
              <div className="profile-track">
                <div className="profile-fill fill-blue" style={{ width: `${speedIndex}%` }}></div>
              </div>
            </div>

            <div className="profile-bar-row">
              <div className="profile-meta">
                <span>Response Consistency</span>
                <span className="mono">{consistencyPercent}%</span>
              </div>
              <div className="profile-track">
                <div className="profile-fill fill-purple" style={{ width: `${consistencyPercent}%` }}></div>
              </div>
            </div>
          </div>

          {/* Difficulty Journey Horizontal Track */}
          <div className="journey-box">
            <h4 className="profile-heading">DIFFICULTY JOURNEY</h4>
            <div className="journey-nodes-row" id="difficulty-journey-track">
              {history.map((item, idx) => (
                <React.Fragment key={idx}>
                  <div className="journey-card-node">
                    <span className="journey-q mono">Q{idx + 1}</span>
                    <span className={`journey-pill diff-${item.difficulty.toLowerCase()}`}>
                      {item.difficulty}
                    </span>
                    <span className="journey-ms mono">{item.responseTime.toFixed(1)}s</span>
                    <span className={`journey-flag ${item.isCorrect ? 'flag-pass' : 'flag-fail'}`}>
                      {item.isCorrect ? 'PASS' : item.timedOut ? 'TIMEOUT' : 'FAIL'}
                    </span>
                  </div>
                  {idx < history.length - 1 && <span className="journey-connector">&rarr;</span>}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* What Happened Section */}
          <div className="debrief-summary-box">
            <h4 className="profile-heading">WHAT HAPPENED</h4>
            <p className="debrief-p">{summary}</p>
          </div>

          {/* Action Row */}
          <div className="result-actions-bar">
            <button
              id="try-another-drill-btn"
              type="button"
              className="btn-launch-drill"
              onClick={onRestart}
            >
              <span>TRY ANOTHER DRILL</span>
              <span className="btn-arrow">&rarr;</span>
            </button>
            <button
              type="button"
              className="btn-toggle-review"
              onClick={() => setShowItemReview(!showItemReview)}
            >
              {showItemReview ? 'Hide Question Breakdown ↑' : 'View Question Breakdown (06) ↓'}
            </button>
          </div>
        </div>

        {/* Detailed Breakdown List (Collapsible) */}
        {showItemReview && (
          <div className="section-card review-breakdown-card">
            <h3 className="section-title">Question-by-Question Telemetry</h3>
            <div className="review-cards-list">
              {history.map((h, i) => (
                <div key={i} className="review-item-card">
                  <div className="review-item-top">
                    <span className="review-q-id mono">
                      Q{i + 1} &bull; {h.category} ({h.difficulty})
                    </span>
                    <span className={`review-status-chip ${h.isCorrect ? 'chip-pass' : 'chip-fail'}`}>
                      {h.isCorrect ? 'CORRECT' : h.timedOut ? 'TIMED OUT' : 'INCORRECT'} ({h.responseTime.toFixed(1)}s)
                    </span>
                  </div>
                  <p className="review-item-q">{h.question}</p>
                  <div className="review-item-ans mono">
                    <div>Your response: <strong className={h.isCorrect ? 'text-success' : 'text-danger'}>
                      {h.selectedOption !== null ? `${String.fromCharCode(65 + h.selectedOption)} (${h.options[h.selectedOption]})` : 'None (Expired/Skipped)'}
                    </strong></div>
                    <div>Correct answer: <strong className="text-success">
                      {String.fromCharCode(65 + h.answer)} ({h.options[h.answer]})
                    </strong></div>
                  </div>
                  <p className="review-item-exp">{h.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Scorecard & Readiness Summary (Replacing Leaderboard) */}
      <div className="grid-right-col">
        <div className="section-card result-scorecard-card">
          <div className="section-header">
            <h3 className="section-title">Readiness Index</h3>
            <span className="rate-badge">Campus Ready</span>
          </div>

          <div className="scorecard-big-stat">
            <span className="scorecard-num mono">{speedIndex}</span>
            <span className="scorecard-label">SPEED SCORE</span>
            <span className="scorecard-sub">{correctCount} of {total} verified correct</span>
          </div>

          <div className="readiness-metrics-group">
            <div className="readiness-tile">
              <span className="tile-title">Avg Latency</span>
              <span className="tile-value mono">{formattedAvgTime}</span>
            </div>
            <div className="readiness-tile">
              <span className="tile-title">Accuracy</span>
              <span className="tile-value mono">{accuracyPercent}%</span>
            </div>
            <div className="readiness-tile">
              <span className="tile-title">Consistency</span>
              <span className="tile-value mono">{consistencyPercent}%</span>
            </div>
          </div>

          <div className="readiness-insights-box">
            <div className="insight-title">Session Takeaway</div>
            <p className="insight-text">
              {accuracyPercent >= 80
                ? 'High accuracy under time constraint confirms strong aptitude foundation.'
                : 'Focus on 8.5s elimination tactics to optimize response speed without error.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
