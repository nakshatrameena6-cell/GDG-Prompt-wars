import React from 'react';

export default function PlaceholderView({ viewType, onLaunchDrill }) {
  const configs = {
    assessment: {
      tag: "PHASE 2 PREVIEW",
      title: "Adaptive Skill Assessments",
      desc: "Calibrated dynamic assessments evaluate true competency level and replace self-claimed ratings with verified benchmarks.",
      bullets: [
        "Item Response Theory (IRT) adaptive difficulty scaling",
        "Deterministic scoring matrix and speed index calculation",
        "Verified badges automatically update role readiness coverage"
      ],
      actionText: "Try Speed Drill Assessment (Demo)",
      onAction: onLaunchDrill,
    },
    mentor: {
      tag: "PHASE 3 PREVIEW",
      title: "AI Placement Mentor",
      desc: "Conversational guidance agent providing personalized explanations, daily learning targets, and interview mock scenarios.",
      bullets: [
        "Context-aware recommendations based on active roadmap modules",
        "Targeted feedback explaining why mistakes occurred",
        "Dynamic pacing adjustments when students struggle"
      ],
      actionText: null,
      onAction: null,
    },
    agents: {
      tag: "AGENTIC AI ARCHITECTURE",
      title: "Autonomous Agent Team",
      desc: "Specialized collaborative agents working in unison to manage learner growth and diagnostic feedback loops.",
      bullets: [
        "Diagnostics Agent: Analyzes skill gaps and tracks verification coverage",
        "Planner Agent: Topologically sequences roadmap modules and handles goal diffs",
        "Assessment Agent: Generates calibrated questions and verifies competencies",
        "Mentor Agent: Delivers contextual coaching and motivational feedback"
      ],
      actionText: null,
      onAction: null,
    }
  };

  const item = configs[viewType] || configs.assessment;

  return (
    <div className="placeholder-view-wrap">
      <div className="section-card placeholder-card">
        <div className="placeholder-badge-row">
          <span className="mission-tag tag-amber">{item.tag}</span>
          <span className="mission-tag">DETERMINISTIC PHASE 1 FOUNDATION</span>
        </div>

        <div className="placeholder-content">
          <h2 className="placeholder-title">{item.title}</h2>
          <p className="placeholder-desc">{item.desc}</p>

          <div className="placeholder-features-list">
            <span className="features-subhead">System Capabilities:</span>
            <ul>
              {item.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>

          {item.actionText && item.onAction && (
            <div className="placeholder-action-box">
              <button
                type="button"
                className="btn-launch-drill"
                onClick={item.onAction}
              >
                <span>{item.actionText}</span>
                <span className="btn-arrow">→</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

