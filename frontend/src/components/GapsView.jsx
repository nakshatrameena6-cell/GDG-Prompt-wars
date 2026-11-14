import React, { useState } from 'react';

export default function GapsView({ state }) {
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'GAPS' | 'SATISFIED'

  if (!state) {
    return (
      <div className="section-card loading-card">
        <p className="loading-text">Loading skill gap analysis...</p>
      </div>
    );
  }

  const { role, skills, readiness, verification_coverage, gap_skills } = state;

  const totalSkills = skills?.length || 0;
  const gapCount = gap_skills?.length || 0;
  const satisfiedCount = totalSkills - gapCount;

  const filteredSkills = skills?.filter(item => {
    if (filter === 'GAPS') return item.gap > 0;
    if (filter === 'SATISFIED') return item.gap === 0;
    return true;
  }) || [];

  return (
    <div className="gaps-container">
      {/* Top Summary Banner */}
      <div className="gaps-summary-grid">
        <div className="stat-card card-blue-tint">
          <div className="stat-card-header">
            <span className="stat-card-title">Target Role Readiness</span>
            <span className="stat-badge-soft">{role?.title}</span>
          </div>
          <div className="stat-card-val-row">
            <span className="stat-large-num mono">{readiness}%</span>
            <span className="stat-subtext">Competency Fulfillment</span>
          </div>
          <div className="bar-track-wrap">
            <div className="bar-fill blue-fill" style={{ width: `${readiness}%` }} />
          </div>
        </div>

        <div className="stat-card card-purple-tint">
          <div className="stat-card-header">
            <span className="stat-card-title">Verification Coverage</span>
            <span className="stat-badge-soft">Empirical Benchmark</span>
          </div>
          <div className="stat-card-val-row">
            <span className="stat-large-num mono">{verification_coverage}%</span>
            <span className="stat-subtext">Assessed Competencies</span>
          </div>
          <div className="bar-track-wrap">
            <div className="bar-fill purple-fill" style={{ width: `${verification_coverage}%` }} />
          </div>
        </div>

        <div className="stat-card card-pink-tint">
          <div className="stat-card-header">
            <span className="stat-card-title">Competency Gaps</span>
            <span className="stat-badge-soft">{gapCount} Remaining</span>
          </div>
          <div className="stat-card-val-row">
            <span className="stat-large-num mono">{gapCount}</span>
            <span className="stat-subtext">Deficits To Close</span>
          </div>
          <div className="bar-track-wrap">
            <div
              className="bar-fill pink-fill"
              style={{
                width: `${totalSkills ? Math.round((satisfiedCount / totalSkills) * 100) : 0}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Itemized Gaps Table Card */}
      <div className="section-card gaps-table-card">
        <div className="section-header">
          <div>
            <span className="card-eyebrow">DIAGNOSTIC MATRIX</span>
            <h3 className="section-title">Required Competencies vs Learner Profile</h3>
          </div>

          <div className="table-filter-pills">
            <button
              type="button"
              className={`filter-pill-btn ${filter === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilter('ALL')}
            >
              All Skills ({totalSkills})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${filter === 'GAPS' ? 'active' : ''}`}
              onClick={() => setFilter('GAPS')}
            >
              Deficits Only ({gapCount})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${filter === 'SATISFIED' ? 'active' : ''}`}
              onClick={() => setFilter('SATISFIED')}
            >
              Satisfied ({satisfiedCount})
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="gaps-table">
            <thead>
              <tr>
                <th>Competency</th>
                <th>Domain</th>
                <th className="text-center">Claimed Level</th>
                <th className="text-center">Verified Level</th>
                <th className="text-center">Effective</th>
                <th className="text-center">Required</th>
                <th className="text-center">Gap Deficit</th>
                <th style={{ width: '180px' }}>Readiness</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSkills.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-table-cell">
                    No skills matching selected filter.
                  </td>
                </tr>
              ) : (
                filteredSkills.map((item) => {
                  const percent = Math.min(
                    100,
                    Math.round((item.effective / (item.required || 1)) * 100)
                  );
                  const hasGap = item.gap > 0;
                  const isSevereGap = item.gap >= 2;

                  return (
                    <tr key={item.skill_id} className={hasGap ? 'row-gap' : 'row-fulfilled'}>
                      <td className="skill-name-cell">
                        <span className="skill-title-text">{item.skill_name}</span>
                      </td>
                      <td>
                        <span className="cat-pill">{item.category}</span>
                      </td>
                      <td className="text-center mono">
                        <span className="level-pill claimed-pill">
                          Level {item.claimed}
                        </span>
                      </td>
                      <td className="text-center mono">
                        {item.verified !== null && item.verified !== undefined ? (
                          <span className="level-pill verified-pill">
                            Level {item.verified}
                          </span>
                        ) : (
                          <span className="level-pill unverified-pill">
                            ⚪ Unverified
                          </span>
                        )}
                      </td>
                      <td className="text-center mono font-bold">
                        <span className="effective-val">L{item.effective}</span>
                      </td>
                      <td className="text-center mono">
                        <span className="required-val">L{item.required}</span>
                      </td>
                      <td className="text-center mono">
                        {hasGap ? (
                          <span className={`gap-badge ${isSevereGap ? 'gap-severe' : 'gap-warning'}`}>
                            -{item.gap}
                          </span>
                        ) : (
                          <span className="gap-badge gap-zero">0</span>
                        )}
                      </td>
                      <td>
                        <div className="table-bar-track">
                          <div
                            className={`table-bar-fill ${hasGap ? 'fill-amber' : 'fill-green'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="table-bar-text mono">{percent}% Met</span>
                      </td>
                      <td className="text-center">
                        {hasGap ? (
                          <span className="status-pill status-gap">Needs Focus</span>
                        ) : (
                          <span className="status-pill status-satisfied">✓ Satisfied</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
