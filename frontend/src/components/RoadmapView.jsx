import React from 'react';

export default function RoadmapView({ state, onCompleteModule, completingModuleId }) {
  if (!state || !state.roadmap) {
    return (
      <div className="section-card loading-card">
        <p>Loading personalized learning roadmap...</p>
      </div>
    );
  }

  const { roadmap, role } = state;

  return (
    <div className="roadmap-container">
      {/* Roadmap Header Card */}
      <div className="section-card roadmap-header-card">
        <div className="roadmap-header-left">
          <span className="card-eyebrow">Topologically Sequenced Learning Path</span>
          <h2 className="section-title">{role?.title} Roadmap</h2>
          <p className="roadmap-desc">
            Prerequisites are enforced in topological order. Complete active modules to unlock downstream requirements.
          </p>
        </div>
        <div className="roadmap-stats-badges">
          <div className="r-stat-chip">
            <span className="r-stat-count">
              {roadmap.filter(m => m.status === 'done').length}/{roadmap.length}
            </span>
            <span className="r-stat-label">Modules Done</span>
          </div>
          <div className="r-stat-chip">
            <span className="r-stat-count active-count">
              {roadmap.filter(m => m.status === 'active').length}
            </span>
            <span className="r-stat-label">Active Now</span>
          </div>
        </div>
      </div>

      {/* Modules List */}
      <div className="roadmap-modules-timeline">
        {roadmap.map((module) => {
          const isDone = module.status === 'done';
          const isActive = module.status === 'active';
          const isLocked = module.status === 'locked';
          const isCompleting = completingModuleId === module.id;

          return (
            <div
              key={module.id}
              className={`module-card status-${module.status}`}
            >
              <div className="module-top-row">
                <div className="module-title-group">
                  <span className="module-step-badge">
                    {isDone ? '✓' : `#${module.order}`}
                  </span>
                  <div>
                    <h3 className="module-title">{module.skill_name}</h3>
                    <div className="module-meta-row">
                      <span className="cat-pill">{module.category}</span>
                      <span className={`priority-tag priority-${(module.priority || 'medium').toLowerCase()}`}>
                        Priority: {module.priority || 'MEDIUM'}
                      </span>
                      <span className="level-target-text mono">
                        Req: L{module.required_level} | Claimed: L{module.claimed_level} | Verified: {module.verified_level !== null && module.verified_level !== undefined ? `L${module.verified_level}` : 'Unverified'}
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

                  {isDone && (
                    <span className="completed-check-label">
                      ✓ Done
                    </span>
                  )}

                  {isLocked && (
                    <span className="locked-helper-text">
                      Prerequisites required
                    </span>
                  )}
                </div>
              </div>

              {/* Module Rationale "Why" Text */}
              <div className="module-why-box">
                <span className="why-label">WHY LEARN THIS:</span>
                <p className="why-text">{module.why}</p>
              </div>

              {/* Prerequisites if any */}
              {module.prerequisites && module.prerequisites.length > 0 && (
                <div className="module-prereqs-row">
                  <span className="prereq-label">Prerequisites:</span>
                  <div className="prereq-tags">
                    {module.prerequisites.map((p) => (
                      <span key={p} className="prereq-pill">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resources as Clickable Links */}
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
                          <span className="res-level-tag mono">L{res.level}</span>
                        </div>
                        <span className="res-link-title">{res.title}</span>
                        <span className="res-external-arrow">↗</span>
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

