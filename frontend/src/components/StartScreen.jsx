import React from 'react';

export default function StartScreen({ onStart }) {
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
          <span>01 / PRACTICE</span>
        </div>
      </header>

      {/* Main Start Container */}
      <main className="start-content">
        <div className="start-hero">
          <div className="hero-eyebrow mono">ASSESSMENT PROTOCOL &bull; TIMED ADAPTIVE ENGINE</div>
          <h1 className="hero-title">
            PLACEMENT<br />
            SPEED DRILL
          </h1>
          <p className="hero-subheading">
            Measure how fast you can think without sacrificing accuracy.
          </p>
        </div>

        {/* Spec Overview Grid */}
        <div className="spec-grid">
          <div className="spec-card">
            <span className="spec-label mono">APTITUDE MIX</span>
            <span className="spec-value">Quantitative &bull; Logical &bull; Verbal</span>
          </div>
          <div className="spec-card">
            <span className="spec-label mono">QUESTIONS</span>
            <span className="spec-value mono">06</span>
          </div>
          <div className="spec-card">
            <span className="spec-label mono">TIME PER ITEM</span>
            <span className="spec-value mono">25s</span>
          </div>
          <div className="spec-card">
            <span className="spec-label mono">STARTING LEVEL</span>
            <span className="spec-value highlight-lime mono">Adaptive (Medium)</span>
          </div>
        </div>

        {/* How It Works Section */}
        <section className="how-it-works">
          <h2 className="section-heading mono">HOW IT WORKS</h2>
          <div className="steps-container">
            <div className="step-row">
              <span className="step-num mono">01</span>
              <div className="step-text">
                <strong>Start at a comfortable difficulty</strong>
                <p>Initial calibration launches at Medium difficulty to gauge baseline reaction time.</p>
              </div>
            </div>
            <div className="step-row">
              <span className="step-num mono">02</span>
              <div className="step-text">
                <strong>Answer quickly and accurately</strong>
                <p>Every millisecond and choice is evaluated against adaptive thresholds.</p>
              </div>
            </div>
            <div className="step-row">
              <span className="step-num mono">03</span>
              <div className="step-text">
                <strong>Difficulty reacts to your performance</strong>
                <p>Fast + correct promotes to Hard. Slow errors recalibrate downwards.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Action Button & Footer */}
        <div className="start-action-row">
          <button
            id="begin-drill-btn"
            className="btn-primary mono"
            onClick={onStart}
            autoFocus
          >
            BEGIN DRILL →
          </button>
          <span className="start-meta-text mono">No login required &bull; 100% Client-Side Evaluation</span>
        </div>
      </main>

      {/* Console Bottom Bar */}
      <footer className="console-footer mono">
        <span>QUANTA INSTRUMENT v2.4</span>
        <span>ENGINE: ADAPTIVE-SPEED-CALIBRATION</span>
      </footer>
    </div>
  );
}
