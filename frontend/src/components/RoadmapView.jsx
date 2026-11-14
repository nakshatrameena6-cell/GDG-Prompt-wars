import React from 'react';
import { IconExternalLink, IconLock, IconCheckCircle } from './Icons';

export default function RoadmapView({ state, onCompleteModule, completingModuleId }) {
  if (!state || !state.roadmap) {
    return (
      <div className="section-card loading-card">
        <p className="loading-text">Loading personalized learning roadmap...</p>
      </div>
    );
  }

  const { roadmap, role } = state;
  const doneCount = roadmap.filter(m => m.status === 'done').length;
  const activeCount = roadmap.filter(m => m.status === 'active').length;
  const lockedCount = roadmap.filter(m => m.status === 'locked').length;

  return (
    <div className="roadmap-container">
      {/* Roadmap Header Card */}
      <div className="section-card roadmap-header-card">
        <div className="roadmap-header-left">
          <div className="card-badge-row">
            <span className="pill-badge pill-badge-indigo">TOPOLOGICAL SEQUENCING</span>
            <span className="pill-badge pill-badge-sky">PREREQUISITE DAG</span>
          </div>
          <h2 className="section-title">{role?.title} Roadmap</h2>
          <p className="section-subtitle">
            Prerequisites are enforced in strict topological dependency order. Complete active modules to unlock downstream requirements.
          </p>
        </div>
        <div className="roadmap-stats-badges">
          <div className="r-stat-chip">
            <span className="r-stat-count">{doneCount}/{roadmap.length}</span>
            <span className="r-stat-label">Modules Done</span>
          </div>
          <div className="r-stat-chip active-chip">
            <span className="r-stat-count active-count">{activeCount}</span>
            <span className="r-stat-label">Active Now</span>
          </div>
          <div className="r-stat-chip">
            <span className="r-stat-count locked-count">{lockedCount}</span>
            <span className="r-stat-label">Locked</span>
          </div>
        </div>
      </div>

      {/* Modules List Timeline */}
      <div className="roadmap-modules-timeline">
        {roadmap.map((module) => {
          const isDone = module.status === 'done';
          const isActive = module.status === 'active';
          const isLocked = module.status === 'locked';
          const isCompleting = completingModuleId === module.id;

          const verifiedText = module.verified_level !== null && module.verified_level !== undefined
            ? `Level ${module.verified_level}`
            : 'Unverified';

          return (
            <div
              key={module.id}
              className={`module-card status-${module.status}`}
            >
              <div className="module-top-row">
                <div className="module-title-group">
                  <div className={`module-step-badge step-${module.status}`}>
                    {isDone ? <IconCheckCircle /> : isLocked ? <IconLock /> : `#${module.order}`}
                  </div>
                  <div>
                    <div className="module-title-header">
                      <h3 className="module-title">{module.skill_name}</h3>
                      <span className={`priority-tag priority-${(module.priority || 'medium').toLowerCase()}`}>
                        {module.priority || 'MEDIUM'} PRIORITY
                      </span>
                    </div>

                    <div className="module-meta-row">
                      <span className="cat-pill">{module.category}</span>
                      <span className="level-meta-text mono">
                        Target: <strong>Level {module.required_level}</strong> • Claimed: Level {module.claimed_level} • Verified: {verifiedText}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="module-status-wrapper">
                  <span className={`status-chip chip-${module.status}`}>
                    {isDone && '✓ Completed'}
                    {isActive && '⚡ Active — Ready to Learn'}
                    {isLocked && '🔒 Locked'}
                  </span>

                  {isActive && (
                    <button
                      type="button"
                      className="btn-mark-complete"
                      onClick={() => onCompleteModule(module.id)}
                      disabled={isCompleting}
                    >
                      {isCompleting ? 'Updating...' : 'Mark Complete ✓'}
                    </button>
                  )}
                </div>
              </div>

              {/* Module Rationale "Why" Text */}
              <div className="module-why-box">
                <span className="why-label">CURRICULUM RATIONALE:</span>
                <p className="why-text">{module.why}</p>
              </div>

              {/* Prerequisites if any */}
              {module.prerequisites && module.prerequisites.length > 0 && (
                <div className="module-prereqs-row">
                  <span className="prereq-label">Prerequisite Chain:</span>
                  <div className="prereq-tags">
                    {module.prerequisites.map((p, idx) => (
                      <React.Fragment key={p}>
                        <span className="prereq-pill">{p}</span>
                        {idx < module.prerequisites.length - 1 && (
                          <span className="prereq-arrow">➔</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Resources as Clickable Cards */}
              {module.resources && module.resources.length > 0 && (
                <div className="module-resources-section">
                  <span className="resources-title">Curated Learning Resources:</span>
                  <div className="resources-links-grid">
                    {module.resources.map((res) => (
                      <a
                        key={res.id}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="resource-card-link"
                        title={res.title}
                      >
                        <div className="res-link-header">
                          <span className="res-type-tag">{res.type}</span>
                          <span className="res-level-tag mono">Level {res.level}</span>
                        </div>
                        <span className="res-link-title">{res.title}</span>
                        <div className="res-link-footer">
                          <span className="res-site-name">Official Resource</span>
                          <IconExternalLink />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
