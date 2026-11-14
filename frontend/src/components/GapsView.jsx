import React from 'react';

export default function GapsView({ state }) {
  if (!state) {
    return (
      <div className="section-card loading-card">
        <p>Loading skill gap analysis...</p>
      </div>
    );
  }

  const { role, skills, readiness, verification_coverage, gap_skills } = state;

  return (
    <div className="gaps-container">
      {/* Top Summary Banner */}
      <div className="gaps-summary-grid">
        <div className="stat-card card-blue-tint">
          <div className="stat-card-header">
            <span className="stat-card-title">Role Readiness</span>
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
            <span className="stat-badge-soft">Assessment Tier</span>
          </div>
          <div className="stat-card-val-row">
            <span className="stat-large-num mono">{verification_coverage}%</span>
            <span className="stat-subtext">Verified Assessment Scores</span>
          </div>
          <div className="bar-track-wrap">
            <div className="bar-fill purple-fill" style={{ width: `${verification_coverage}%` }} />
          </div>
        </div>

        <div className="stat-card card-pink-tint">
          <div className="stat-card-header">
            <span className="stat-card-title">Target Deficits</span>
            <span className="stat-badge-soft">{gap_skills?.length} Remaining</span>
          </div>
          <div className="stat-card-val-row">
            <span className="stat-large-num mono">{gap_skills?.length}</span>
            <span className="stat-subtext">Skill Gaps To Close</span>
          </div>
          <div className="bar-track-wrap">
            <div
              className="bar-fill pink-fill"
              style={{
                width: `${skills?.length ? Math.round(((skills.length - gap_skills.length) / skills.length) * 100) : 0}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Itemized Gaps Table */}
      <div className="section-card gaps-table-card">
        <div className="section-header">
          <div>
            <span className="card-eyebrow">Diagnostic Breakdown</span>
            <h3 className="section-title">Required Competencies vs Learner Profile</h3>
          </div>
          <span className="role-chip-tag">{role?.title} Target</span>
        </div>

        <div className="table-responsive">
          <table className="gaps-table">
            <thead>
              <tr>
                <th>Skill</th>
                <th>Category</th>
                <th className="text-center">Claimed</th>
                <th className="text-center">Verified</th>
                <th className="text-center">Effective</th>
                <th className="text-center">Required</th>
                <th className="text-center">Gap</th>
                <th style={{ width: '180px' }}>Readiness Bar</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {skills?.map((item) => {
                const percent = Math.min(
                  100,
                  Math.round((item.effective / (item.required || 1)) * 100)
                );
                const hasGap = item.gap > 0;

                return (
                  <tr key={item.skill_id} className={hasGap ? 'row-gap' : 'row-fulfilled'}>
                    <td className="skill-name-cell">
                      <strong>{item.skill_name}</strong>
                    </td>
                    <td>
                      <span className="cat-pill">{item.category}</span>
                    </td>
                    <td className="text-center mono">
                      Level {item.claimed}
                    </td>
                    <td className="text-center mono">
                      {item.verified !== null && item.verified !== undefined ? (
                        <span className="verified-badge">Level {item.verified}</span>
                      ) : (
                        <span className="unverified-text">Unverified</span>
                      )}
                    </td>
                    <td className="text-center mono font-bold">
                      {item.effective}
                    </td>
                    <td className="text-center mono">
                      {item.required}
                    </td>
                    <td className="text-center mono">
                      {hasGap ? (
                        <span className="gap-badge-danger">-{item.gap}</span>
                      ) : (
                        <span className="gap-badge-zero">0</span>
                      )}
                    </td>
                    <td>
                      <div className="table-bar-track">
                        <div
                          className={`table-bar-fill ${hasGap ? 'fill-amber' : 'fill-green'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="table-bar-text mono">{percent}%</span>
                    </td>
                    <td className="text-center">
                      {hasGap ? (
                        <span className="status-pill status-gap">Gap</span>
                      ) : (
                        <span className="status-pill status-satisfied">✓ Satisfied</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

