import React, { useState, useEffect } from 'react';
import { fetchTechnicalQuestions, submitAssessment } from '../api';
import { IconClock, IconShield, IconSparkles } from './Icons';

export default function AssessmentView({ profileId, onAssessmentComplete }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [responseTimes, setResponseTimes] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    fetchTechnicalQuestions()
      .then(data => {
        setQuestions(data.questions || []);
        setLoading(false);
        setQuestionStartTime(Date.now());
      })
      .catch(err => {
        console.error('Failed to load technical questions:', err);
        setLoading(false);
      });
  }, []);

  const handleStart = () => {
    setHasStarted(true);
    setQuestionStartTime(Date.now());
  };

  const handleSelectOption = (optionIndex) => {
    const elapsed = Math.round(((Date.now() - questionStartTime) / 1000) * 10) / 10;
    const currentQ = questions[currentIndex];

    setSelectedAnswers(prev => ({
      ...prev,
      [currentQ.id]: optionIndex
    }));

    setResponseTimes(prev => ({
      ...prev,
      [currentQ.id]: elapsed
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const responsesPayload = questions.map(q => ({
      question_id: q.id,
      skill_id: q.skill_id,
      selected_option: selectedAnswers[q.id] !== undefined ? selectedAnswers[q.id] : -1,
      response_time: responseTimes[q.id] || 10.0,
      difficulty: q.difficulty,
      error_tag: q.error_tag,
    }));

    try {
      const data = await submitAssessment(responsesPayload, profileId);
      setResults(data);
      if (onAssessmentComplete) {
        onAssessmentComplete(data.state);
      }
    } catch (err) {
      alert(`Error submitting assessment: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="section-card loading-card">
        <p className="loading-text">Loading calibrated technical assessment questions...</p>
      </div>
    );
  }

  // Results Screen
  if (results) {
    const weakness = results.weakness_analysis || {};
    const signals = weakness.signals || [];
    const verifiedLevels = weakness.verified_levels || {};

    return (
      <div className="assessment-results-container">
        <div className="section-card results-header-card">
          <div className="card-badge-row">
            <span className="pill-badge pill-badge-emerald">ASSESSMENT COMPLETED</span>
            <span className="pill-badge pill-badge-indigo">EMPIRICAL VERIFICATION</span>
          </div>

          <h2 className="section-title">
            Evaluation Result: {results.score}/{results.total} ({results.accuracy_pct}%)
          </h2>
          <p className="section-subtitle">
            Your self-claimed ratings have been calibrated with empirical assessment benchmarks. Verified skill levels are now active across your diagnostic gaps and learning roadmap.
          </p>

          <div className="verified-skills-chips-row">
            <span className="chip-row-label">Verified Skill Levels:</span>
            <div className="chips-grid">
              {Object.entries(verifiedLevels).map(([skill, lvl]) => (
                <div key={skill} className="verified-chip-card">
                  <span className="chip-skill-name">{skill.toUpperCase()}</span>
                  <span className="chip-level-badge">Level {lvl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weakness Detective Heuristics */}
        <div className="section-card weakness-card">
          <div className="section-header">
            <div>
              <span className="card-eyebrow">ROOT-CAUSE-LITE TELEMETRY</span>
              <h3 className="section-title">Weakness Detective Diagnostic Report</h3>
            </div>
            <span className="subhead-meta">Algorithmic Error Attribution</span>
          </div>

          <div className="signals-list-grid">
            {signals.map((sig, idx) => (
              <div key={idx} className={`signal-item-card signal-${sig.type}`}>
                <div className="signal-header">
                  <span className="signal-type-tag">
                    {sig.type.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span className="signal-skill-tag mono">{sig.skill_id}</span>
                </div>
                <p className="signal-heuristic-text">{sig.heuristic}</p>
                {sig.error_tag && (
                  <span className="signal-error-pill mono">
                    Diagnostic Tag: {sig.error_tag}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="reset-assessment-row">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setResults(null);
                setHasStarted(false);
                setCurrentIndex(0);
                setSelectedAnswers({});
                setResponseTimes({});
                setQuestionStartTime(Date.now());
              }}
            >
              <span>🔄 Retake Technical Assessment</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Intro Screen (if not started yet)
  if (!hasStarted) {
    return (
      <div className="assessment-intro-card section-card">
        <div className="intro-badge-row">
          <span className="pill-badge pill-badge-indigo">EMPIRICAL BENCHMARKING</span>
          <span className="pill-badge pill-badge-emerald">15 QUESTIONS</span>
        </div>

        <h2 className="section-title">Technical Competency Assessment</h2>
        <p className="intro-lead-text">
          Calibrate your self-reported skill ratings with real empirical evaluation. This assessment evaluates core competencies across JavaScript, React, Node.js, Python, and SQL with adaptive difficulty and latency telemetry.
        </p>

        <div className="intro-features-grid">
          <div className="intro-feat-item">
            <div className="feat-icon-box"><IconShield /></div>
            <div>
              <h4 className="feat-title">Deterministic Verification</h4>
              <p className="feat-desc">Empirical scores replace unverified self-ratings to establish credible readiness metrics.</p>
            </div>
          </div>

          <div className="intro-feat-item">
            <div className="feat-icon-box"><IconClock /></div>
            <div>
              <h4 className="feat-title">Latency Telemetry</h4>
              <p className="feat-desc">Response times distinguish careless mistakes from persistent conceptual weaknesses.</p>
            </div>
          </div>

          <div className="intro-feat-item">
            <div className="feat-icon-box"><IconSparkles /></div>
            <div>
              <h4 className="feat-title">Root-Cause Insights</h4>
              <p className="feat-desc">The Weakness Detective agent categorizes error patterns to guide roadmap scheduling.</p>
            </div>
          </div>
        </div>

        <div className="intro-action-footer">
          <button
            type="button"
            className="btn-primary btn-lg"
            onClick={handleStart}
          >
            <span>Begin Technical Assessment (15 Questions) ➔</span>
          </button>
        </div>
      </div>
    );
  }

  // Question Runner
  const currentQ = questions[currentIndex];
  const isAnswered = selectedAnswers[currentQ?.id] !== undefined;
  const answeredCount = Object.keys(selectedAnswers).length;
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="technical-assessment-container">
      <div className="section-card assessment-runner-card">
        {/* Top Progress Track */}
        <div className="assessment-progress-wrapper" aria-live="polite">
          <div className="progress-label-row">
            <span className="progress-step-text">
              Question <strong>{currentIndex + 1}</strong> of {questions.length}
            </span>
            <span className="progress-pct-text mono">{progressPercent}% Completed</span>
          </div>
          <div className="assessment-progress-bar" role="progressbar" aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100">
            <div
              className="assessment-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="assessment-runner-header">
          <div>
            <span className="card-eyebrow">QUESTION {currentIndex + 1}</span>
            <h2 className="runner-question-title">
              Technical Skill Diagnostic
            </h2>
          </div>
          <div className="assessment-runner-badges">
            <span className="spec-chip">Skill: <strong>{currentQ?.skill_id.toUpperCase()}</strong></span>
            <span className={`spec-chip difficulty-${currentQ?.difficulty.toLowerCase()}`}>
              Difficulty: <strong>{currentQ?.difficulty}</strong>
            </span>
          </div>
        </div>

        <div className="question-body-box">
          <h3 className="question-text" id="current-question-text">{currentQ?.question}</h3>

          <div className="options-selection-grid" role="radiogroup" aria-labelledby="current-question-text">
            {currentQ?.options.map((optText, optIdx) => {
              const isSelected = selectedAnswers[currentQ.id] === optIdx;
              const letter = ['A', 'B', 'C', 'D'][optIdx];
              return (
                <button
                  key={optIdx}
                  type="button"
                  className={`assessment-option-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(optIdx)}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Option ${letter}: ${optText}`}
                >
                  <span className="option-indicator mono" aria-hidden="true">{letter}</span>
                  <span className="option-text">{optText}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="assessment-controls-footer">
          <div className="controls-left">
            <button
              type="button"
              className="btn-secondary"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              ← Previous
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleNext}
              disabled={currentIndex === questions.length - 1}
            >
              Next Question →
            </button>
          </div>

          <div className="controls-right">
            <span className="progress-counter mono">
              {answeredCount}/{questions.length} answered
            </span>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmit}
              disabled={submitting || answeredCount === 0}
            >
              {submitting ? 'Scoring Answers...' : 'Submit Assessment ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
