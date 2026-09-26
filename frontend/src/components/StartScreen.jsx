import React from 'react';

export default function StartScreen({ onStart }) {
  return (
    <div className="dashboard-grid">
      {/* Left Column: Categories + Speed Drill Launch Card */}
      <div className="grid-left-col">
        {/* Categories Section */}
        <div className="section-card">
          <div className="section-header">
            <h3 className="section-title">
              Assessment Categories <span className="count-badge">3</span>
            </h3>
          </div>

          <div className="categories-pills-row">
            <div className="category-pill active-pill">
              <span className="cat-icon cat-orange">📊</span>
              <span className="cat-name">Quantitative</span>
            </div>
            <div className="category-pill">
              <span className="cat-icon cat-purple">🧩</span>
              <span className="cat-name">Logical</span>
            </div>
            <div className="category-pill">
              <span className="cat-icon cat-green">📝</span>
              <span className="cat-name">Verbal</span>
            </div>
          </div>
        </div>

        {/* Speed Drill Launch Card */}
        <div className="mission-card">
          <div className="mission-badge-row">
            <span className="mission-tag">PLACEMENT DRILL</span>
            <span className="mission-tag tag-amber">ADAPTIVE ENGINE</span>
          </div>

          <div className="mission-body">
            <div className="mission-meta">
              <h2 className="mission-title">Placement Speed Drill</h2>
              <p className="mission-desc">
                Measure how fast you can think without sacrificing accuracy. Real-time difficulty calibration.
              </p>
            </div>

            <div className="mission-specs-chips">
              <span className="spec-chip"><strong>06</strong> Questions</span>
              <span className="spec-chip"><strong>25s</strong> Per Item</span>
              <span className="spec-chip highlight"><strong>Adaptive</strong> Medium Start</span>
            </div>

            <button
              id="begin-drill-btn"
              type="button"
              className="btn-launch-drill"
              onClick={onStart}
            >
              <span>BEGIN DRILL NOW</span>
              <span className="btn-arrow">→</span>
            </button>
            <span className="launch-subtext">No login required &bull; 100% Client-Side Evaluation</span>
          </div>
        </div>
      </div>

      {/* Middle Column: Adaptive Calibration Graph & How It Works */}
      <div className="grid-mid-col">
        {/* Adaptive Calibration Visualizer (Matching "Study Success" from template) */}
        <div className="section-card telemetry-card">
          <div className="section-header">
            <div>
              <span className="card-eyebrow">Real-Time Calibration</span>
              <h3 className="section-title">Adaptive Engine Curve</h3>
            </div>
            <span className="rate-badge">⚡ Real-Time</span>
          </div>

          <div className="chart-preview-container">
            <div className="chart-bars-wrap">
              {[35, 42, 50, 68, 60, 75, 82, 95, 78, 85, 92, 98].map((h, i) => (
                <div key={i} className="chart-bar-col">
                  <div
                    className={`chart-bar-fill ${i >= 7 ? 'highlight-bar' : ''}`}
                    style={{ height: `${h}%` }}
                    title={`Round ${i + 1}: ${h}% Intensity`}
                  />
                  <span className="bar-label">{`R${i + 1}`}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-legend">
            <span>Fast + Accurate &rarr; Promotes to Hard</span>
            <span className="legend-dot"></span>
            <span>Slow + Error &rarr; Calibrates Down</span>
          </div>
        </div>

        {/* How It Works Steps */}
        <div className="section-card steps-card">
          <div className="section-header">
            <h3 className="section-title">How It Works</h3>
            <span className="step-count-badge">03 Steps</span>
          </div>

          <div className="steps-list">
            <div className="step-item">
              <div className="step-circle step-circle-blue">01</div>
              <div className="step-info">
                <strong>Start at Medium Baseline</strong>
                <p>Initial assessment launches at Medium difficulty to evaluate reaction tempo.</p>
              </div>
            </div>

            <div className="step-item">
              <div className="step-circle step-circle-purple">02</div>
              <div className="step-info">
                <strong>Answer Fast and Accurately</strong>
                <p>Every millisecond and choice is evaluated against the 8.5s speed threshold.</p>
              </div>
            </div>

            <div className="step-item">
              <div className="step-circle step-circle-pink">03</div>
              <div className="step-info">
                <strong>Difficulty Adapts Immediately</strong>
                <p>Instant promotion to Hard on rapid correct answers; smooth recalibration on slow lapses.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Readiness Benchmarks & Rules (Replacing Leaderboard) */}
      <div className="grid-right-col">
        <div className="section-card readiness-card">
          <div className="section-header">
            <h3 className="section-title">Placement Benchmarks</h3>
            <span className="rate-badge">Campus Target</span>
          </div>

          <div className="benchmarks-list">
            <div className="benchmark-row">
              <div className="bench-meta">
                <span>Quantitative Aptitude</span>
                <span className="bench-score">85%</span>
              </div>
              <div className="bench-bar-track">
                <div className="bench-bar-fill fill-blue" style={{ width: '85%' }}></div>
              </div>
            </div>

            <div className="benchmark-row">
              <div className="bench-meta">
                <span>Logical Reasoning</span>
                <span className="bench-score">90%</span>
              </div>
              <div className="bench-bar-track">
                <div className="bench-bar-fill fill-purple" style={{ width: '90%' }}></div>
              </div>
            </div>

            <div className="benchmark-row">
              <div className="bench-meta">
                <span>Verbal Ability</span>
                <span className="bench-score">80%</span>
              </div>
              <div className="bench-bar-track">
                <div className="bench-bar-fill fill-pink" style={{ width: '80%' }}></div>
              </div>
            </div>
          </div>

          <div className="rules-summary-box">
            <div className="rules-title">Adaptive Rules Summary</div>
            <div className="rule-bullet">
              <span className="rule-symbol sym-green">▲</span>
              <span>Correct + Fast (&le; 8.5s) &rarr; <strong>Level UP</strong></span>
            </div>
            <div className="rule-bullet">
              <span className="rule-symbol sym-amber">●</span>
              <span>Correct + Slow (&gt; 8.5s) &rarr; <strong>HOLD</strong></span>
            </div>
            <div className="rule-bullet">
              <span className="rule-symbol sym-amber">●</span>
              <span>Wrong + Fast (&le; 8.5s) &rarr; <strong>HOLD</strong></span>
            </div>
            <div className="rule-bullet">
              <span className="rule-symbol sym-red">▼</span>
              <span>Wrong + Slow (&gt; 8.5s) &rarr; <strong>Level DOWN</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
