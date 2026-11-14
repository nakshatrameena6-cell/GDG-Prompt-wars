import React, { useState, useEffect } from 'react';
import { previewGoal } from '../api';

export default function ProfileView({
  profile,
  profileSummary,
  catalog,
  userSkills,
  onUpdateProfile,
  onLoadSampleStudent,
  onGoalChange,
  loading
}) {
  const [name, setName] = useState(profile?.name || '');
  const [interests, setInterests] = useState(profile?.interests || '');
  const [selectedGoal, setSelectedGoal] = useState(profile?.goal || 'full_stack_developer');
  const [ratings, setRatings] = useState({});
  const [goalPreview, setGoalPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setInterests(profile.interests || '');
      setSelectedGoal(profile.goal || 'full_stack_developer');
    }
  }, [profile]);

  useEffect(() => {
    if (userSkills && catalog?.skills) {
      const initial = {};
      catalog.skills.forEach(skill => {
        initial[skill.id] = userSkills[skill.id]?.claimed_level || 0;
      });
      setRatings(initial);
    }
  }, [userSkills, catalog]);

  // Preview goal change when selecting a different goal
  useEffect(() => {
    if (selectedGoal && profile?.goal && selectedGoal !== profile.goal) {
      setPreviewLoading(true);
      previewGoal(selectedGoal, profile.id)
        .then(data => {
          setGoalPreview(data);
          setPreviewLoading(false);
        })
        .catch(() => setPreviewLoading(false));
    } else {
      setGoalPreview(null);
    }
  }, [selectedGoal, profile]);

  const handleSliderChange = (skillId, val) => {
    setRatings(prev => ({ ...prev, [skillId]: parseInt(val, 10) }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (onUpdateProfile) {
      await onUpdateProfile({
        name,
        interests,
        goal: selectedGoal,
        skills: ratings
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleApplyGoal = async () => {
    if (onGoalChange && selectedGoal !== profile?.goal) {
      await onGoalChange(selectedGoal);
      setGoalPreview(null);
    }
  };

  const handleCancelPreview = () => {
    setSelectedGoal(profile?.goal || 'full_stack_developer');
    setGoalPreview(null);
  };

  const categories = ['ALL', ...new Set(catalog?.skills?.map(s => s.category) || [])];
  const filteredSkills = catalog?.skills?.filter(s =>
    activeCategoryFilter === 'ALL' || s.category === activeCategoryFilter
  ) || [];

  const getLevelLabel = (lvl) => {
    switch (lvl) {
      case 0: return 'Unskilled (0)';
      case 1: return 'Novice (1)';
      case 2: return 'Basic (2)';
      case 3: return 'Competent (3)';
      case 4: return 'Proficient (4)';
      case 5: return 'Master (5)';
      default: return `Level ${lvl}`;
    }
  };

  return (
    <div className="profile-container">
      {/* Welcome & Management Banner */}
      <div className="section-card profile-header-card">
        <div className="profile-header-info">
          <div>
            <div className="card-badge-row">
              <span className="pill-badge pill-badge-indigo">LEARNER PROFILE</span>
              <span className="pill-badge pill-badge-emerald">ACTIVE SESSION</span>
            </div>
            <h2 className="section-title">
              Welcome back, {name || 'Student'} 👋
            </h2>
            <p className="section-subtitle">
              Manage your career objectives, calibrate self-reported proficiencies, and review autonomous profile intelligence.
            </p>
          </div>
          <div className="profile-actions-row">
            <button
              type="button"
              className="btn-secondary"
              onClick={onLoadSampleStudent}
              disabled={loading}
              title="Reset profile to default sample student with Python 3, SQL 3, and HTML/CSS 2"
            >
              <span>🔄 Load Sample Student</span>
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={loading}
            >
              <span>💾 Save Profile</span>
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="alert-success-banner">
            ✓ Profile, interests, and competency ratings updated successfully!
          </div>
        )}

        {/* Profile Attributes Form */}
        <div className="profile-form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="student-name-input">
              Student Full Name
            </label>
            <input
              id="student-name-input"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sample Student"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="target-goal-select">
              Target Career Role
            </label>
            <select
              id="target-goal-select"
              className="form-select"
              value={selectedGoal}
              onChange={(e) => setSelectedGoal(e.target.value)}
            >
              {catalog?.roles?.map(role => (
                <option key={role.id} value={role.id}>
                  {role.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '16px' }}>
          <label className="form-label" htmlFor="student-interests-input">
            Technical Interests & Specialization Areas
          </label>
          <input
            id="student-interests-input"
            type="text"
            className="form-input"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="e.g. Full-stack web architecture, API engineering, relational databases"
          />
        </div>

        {/* Goal Change Preview Card */}
        {goalPreview && (
          <div className="goal-preview-card">
            <div className="preview-header">
              <div>
                <span className="badge-preview">CAREER TRANSITION PREVIEW</span>
                <h4 className="preview-heading">
                  Switching to {catalog?.roles?.find(r => r.id === selectedGoal)?.title}
                </h4>
              </div>
              <div className="preview-buttons">
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={handleCancelPreview}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={handleApplyGoal}
                  disabled={loading}
                >
                  Confirm Switch →
                </button>
              </div>
            </div>

            <div className="preview-metrics-row">
              <div className="metric-box">
                <span className="metric-lbl">READINESS BEFORE</span>
                <span className="metric-val">{goalPreview.readiness_before}%</span>
              </div>
              <div className="metric-arrow">➔</div>
              <div className="metric-box highlight-box">
                <span className="metric-lbl">PROJECTED READINESS</span>
                <span className="metric-val highlight">{goalPreview.readiness_after}%</span>
              </div>
            </div>

            <div className="preview-skills-summary">
              <div className="preview-col">
                <span className="col-title kept-title">
                  ✓ Transferable Competencies ({goalPreview.kept_skills.length})
                </span>
                <div className="tags-wrap">
                  {goalPreview.kept_skills.map(s => (
                    <span key={s} className="tag tag-kept">{s}</span>
                  ))}
                </div>
              </div>

              <div className="preview-col">
                <span className="col-title added-title">
                  + Newly Required Competencies ({goalPreview.added_skills.length})
                </span>
                <div className="tags-wrap">
                  {goalPreview.added_skills.map(s => (
                    <span key={s} className="tag tag-added">+{s}</span>
                  ))}
                </div>
              </div>

              <div className="preview-col">
                <span className="col-title removed-title">
                  - Non-Essential For New Goal ({goalPreview.removed_skills.length})
                </span>
                <div className="tags-wrap">
                  {goalPreview.removed_skills.map(s => (
                    <span key={s} className="tag tag-removed">-{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile Analyst Intelligence Card */}
      {profileSummary && (
        <div className="section-card profile-summary-card">
          <div className="section-header">
            <div>
              <span className="card-eyebrow">DIAGNOSTIC SYNTHESIS</span>
              <h3 className="section-title">Autonomous Profile Analyst Summary</h3>
            </div>
            <span className="role-chip-tag">
              Target: {profileSummary.selected_career?.title}
            </span>
          </div>

          <div className="summary-details-grid">
            <div className="summary-item">
              <span className="summary-label">Target Role</span>
              <span className="summary-value font-bold">{profileSummary.selected_career?.title}</span>
            </div>

            <div className="summary-item">
              <span className="summary-label">Technical Focus</span>
              <span className="summary-value">{profileSummary.interests || 'Not specified'}</span>
            </div>

            <div className="summary-item">
              <span className="summary-label">Claimed Strengths</span>
              <div className="tags-wrap" style={{ marginTop: '6px' }}>
                {profileSummary.claimed_strengths?.length > 0 ? (
                  profileSummary.claimed_strengths.map(s => (
                    <span key={s.skill_id} className="tag tag-kept">
                      {s.skill_name} (Level {s.claimed_level})
                    </span>
                  ))
                ) : (
                  <span className="unverified-text">No skills claimed at Level 3+ yet</span>
                )}
              </div>
            </div>

            <div className="summary-item">
              <span className="summary-label">Priority Deficits</span>
              <div className="tags-wrap" style={{ marginTop: '6px' }}>
                {profileSummary.main_skill_gaps?.length > 0 ? (
                  profileSummary.main_skill_gaps.map(g => (
                    <span key={g.skill_id} className="tag tag-removed">
                      {g.skill_name} (-{g.gap})
                    </span>
                  ))
                ) : (
                  <span className="tag tag-kept">All required competencies fulfilled</span>
                )}
              </div>
            </div>
          </div>

          <div className="profile-observation-box">
            <div className="obs-header">
              <span className="obs-label">AI PROFILE OBSERVATION:</span>
              <span className="pill-badge pill-badge-sky">PERSISTED</span>
            </div>
            <p className="obs-text">{profileSummary.observation}</p>
          </div>
        </div>
      )}

      {/* Skills Self-Claimed Ratings Section */}
      <div className="section-card skills-ratings-card">
        <div className="section-header">
          <div>
            <span className="card-eyebrow">COMPETENCY CALIBRATION</span>
            <h3 className="section-title">Self-Claimed Skill Levels (0 - 5 Scale)</h3>
          </div>
          <span className="subhead-meta">Adjust sliders to calibrate diagnostic gaps</span>
        </div>

        {/* Category Filter Pills */}
        <div className="category-filter-row">
          <span className="filter-label">Category Filter:</span>
          <div className="filter-pills-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`filter-pill-btn ${activeCategoryFilter === cat ? 'active' : ''}`}
                onClick={() => setActiveCategoryFilter(cat)}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="skills-sliders-grid">
          {filteredSkills.map(skill => {
            const currentVal = ratings[skill.id] || 0;
            return (
              <div key={skill.id} className="skill-slider-card">
                <div className="slider-card-top">
                  <div className="skill-info-block">
                    <span className="skill-slider-name">{skill.name}</span>
                    <span className="skill-category-badge">{skill.category}</span>
                  </div>
                  <span className={`slider-value-chip level-${currentVal}`}>
                    {getLevelLabel(currentVal)}
                  </span>
                </div>

                <div className="slider-input-group">
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    className="rating-slider"
                    value={currentVal}
                    onChange={(e) => handleSliderChange(skill.id, e.target.value)}
                    aria-label={`Claimed proficiency level for ${skill.name}`}
                    aria-valuemin="0"
                    aria-valuemax="5"
                    aria-valuenow={currentVal}
                    aria-valuetext={getLevelLabel(currentVal)}
                  />
                  <div className="slider-ticks">
                    <span>0</span>
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
