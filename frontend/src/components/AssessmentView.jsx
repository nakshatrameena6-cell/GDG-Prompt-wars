import React, { useState, useEffect } from 'react';
import { fetchTechnicalQuestions, submitAssessment } from '../api';

export default function AssessmentView({ profileId, onAssessmentComplete }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
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
        <p>Loading calibrated technical questions...</p>
      </div>
    );
  }

  if (results) {
    const weakness = results.weakness_analysis || {};
    const signals = weakness.signals || [];
    const verifiedLevels = weakness.verified_levels || {};

    return (
      <div className="assessment-results-container">
        <div className="section-card results-header-card">
          <div className="placeholder-badge-row">
            <span className="mission-tag tag-amber">TECHNICAL ASSESSMENT DEBRIEF</span>
            <span className="mission-tag">DETERMINISTIC VERIFICATION</span>
          </div>

          <h2 className="placeholder-title">Assessment Completed: {results.score}/{results.total} ({results.accuracy_pct}%)</h2>
          <p className="placeholder-desc">
            Your self-claimed ratings have been calibrated with empirical assessment benchmarks. Verified skill levels are now active across your diagnostic gaps and learning roadmap.
          </p>

          <div className="verified-skills-chips-row">
            <span className="chip-row-label">Verified Competencies:</span>
            {Object.entries(verifiedLevels).map(([skill, lvl]) => (
              <span key={skill} className="verified-chip-pill">
                <strong>{skill.toUpperCase()}</strong>: Level {lvl}
              </span>
            ))}
          </div>
        </div>

        {/* Weakness Detective Heuristics */}
        <div className="section-card weakness-card">
          <div className="section-header">
            <div>
              <span className="card-eyebrow">Root-Cause-Lite Detection</span>
              <h3 className="section-title">Weakness Detective Diagnostic Report</h3>
            </div>
            <span className="subhead-meta">Telemetry Heuristics</span>
          </div>

          <div className="signals-list-grid">
            {signals.map((sig, idx) => (
              <div key={idx} className={`signal-item-card signal-${sig.type}`}>
                <div className="signal-header">
                  <span className="signal-type-tag">{sig.type.replace('_', ' ').toUpperCase()}</span>
                  <span className="signal-skill-tag mono">{sig.skill_id}</span>
                </div>
                <p className="signal-heuristic-text">{sig.heuristic}</p>
                {sig.error_tag && (
                  <span className="signal-error-pill mono">Tag: {sig.error_tag}</span>
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
                setCurrentIndex(0);
                setSelectedAnswers({});
                setQuestionStartTime(Date.now());
              }}
            >
              🔄 Retake Technical Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isAnswered = selectedAnswers[currentQ?.id] !== undefined;
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="technical-assessment-container">
      <div className="section-card assessment-runner-card">
        <div className="assessment-runner-header">
          <div>
            <span className="card-eyebrow">Calibrated Empirical Evaluation</span>
            <h2 className="section-title">
              Technical Competency Assessment (Q{currentIndex + 1} of {questions.length})
            </h2>
          </div>
          <div className="assessment-runner-badges">
            <span className="spec-chip">Skill: <strong>{currentQ?.skill_id.toUpperCase()}</strong></span>
            <span className={`spec-chip difficulty-${currentQ?.difficulty.toLowerCase()}`}>
              Tier: <strong>{currentQ?.difficulty}</strong>
            </span>
          </div>
        </div>

        <div className="question-body-box">
          <h3 className="question-text">{currentQ?.question}</h3>

          <div className="options-selection-grid">
            {currentQ?.options.map((optText, optIdx) => {
              const isSelected = selectedAnswers[currentQ.id] === optIdx;
              return (
                <button
                  key={optIdx}
                  type="button"
                  className={`assessment-option-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(optIdx)}
                >
                  <span className="option-indicator mono">{['A', 'B', 'C', 'D'][optIdx]}</span>
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
              Next →
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
