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
      setTimeout(() => setSaveSuccess(false), 2500);
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

  return (
    <div className="profile-container">
      {/* Top Banner with Load Sample Student */}
      <div className="section-card profile-header-card">
        <div className="profile-header-info">
          <div>
            <span className="card-eyebrow">Learner Profile Management</span>
            <h2 className="section-title">Student Profile & Competencies</h2>
          </div>
          <div className="profile-actions-row">
            <button
              type="button"
              className="btn-secondary"
              onClick={onLoadSampleStudent}
              disabled={loading}
              title="Reset and load default sample student (Python 3, SQL 3, html_css 2)"
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
            ✓ Profile, interests, and skill ratings updated successfully!
          </div>
        )}

        <div className="profile-form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="student-name-input">Student Name</label>
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
            <label className="form-label" htmlFor="target-goal-select">Target Career Goal</label>
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
            Technical Interests & Focus Areas
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

        {/* Goal Change Preview Card (POST /goal/preview demonstration) */}
        {goalPreview && (
          <div className="goal-preview-card">
            <div className="preview-header">
              <span className="badge-preview">Goal Change Impact Preview</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCancelPreview}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-apply-goal"
                  onClick={handleApplyGoal}
                  disabled={loading}
                >
                  Confirm Switch to {catalog?.roles?.find(r => r.id === selectedGoal)?.title} →
                </button>
              </div>
            </div>

            <div className="preview-metrics-row">
              <div className="metric-box">
                <span className="metric-lbl">Readiness Before</span>
                <span className="metric-val">{goalPreview.readiness_before}%</span>
              </div>
              <div className="metric-arrow">➔</div>
              <div className="metric-box">
                <span className="metric-lbl">Readiness After</span>
                <span className="metric-val highlight">{goalPreview.readiness_after}%</span>
              </div>
            </div>

            <div className="preview-skills-summary">
              <div className="preview-col">
                <span className="col-title kept-title">Kept Skills ({goalPreview.kept_skills.length})</span>
                <div className="tags-wrap">
                  {goalPreview.kept_skills.map(s => (
                    <span key={s} className="tag tag-kept">{s}</span>
                  ))}
                </div>
              </div>

              <div className="preview-col">
                <span className="col-title added-title">Added Skills ({goalPreview.added_skills.length})</span>
                <div className="tags-wrap">
                  {goalPreview.added_skills.map(s => (
                    <span key={s} className="tag tag-added">+{s}</span>
                  ))}
                </div>
              </div>

              <div className="preview-col">
                <span className="col-title removed-title">Removed Skills ({goalPreview.removed_skills.length})</span>
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

      {/* Profile Analyst Intelligence Card (Deterministic Zero-LLM) */}
      {profileSummary && (
        <div className="section-card profile-summary-card">
          <div className="section-header">
            <div>
              <span className="card-eyebrow">Profile Intelligence</span>
              <h3 className="section-title">Deterministic Profile Analyst Summary</h3>
            </div>
            <span className="subhead-meta">Zero-LLM Phase 1 Foundation</span>
          </div>

          <div className="summary-details-grid">
            <div className="summary-item">
              <span className="summary-label">Target Career</span>
              <span className="summary-value font-bold">{profileSummary.selected_career?.title}</span>
            </div>

            <div className="summary-item">
              <span className="summary-label">Focus Interests</span>
              <span className="summary-value">{profileSummary.interests}</span>
            </div>

            <div className="summary-item">
              <span className="summary-label">Claimed Strengths</span>
              <div className="tags-wrap" style={{ marginTop: '4px' }}>
                {profileSummary.claimed_strengths?.length > 0 ? (
                  profileSummary.claimed_strengths.map(s => (
                    <span key={s.skill_id} className="tag tag-kept">
                      {s.skill_name} (L{s.claimed_level})
                    </span>
                  ))
                ) : (
                  <span className="unverified-text">No skills claimed at Level 3+ yet</span>
                )}
              </div>
            </div>

            <div className="summary-item">
              <span className="summary-label">Primary Gaps</span>
              <div className="tags-wrap" style={{ marginTop: '4px' }}>
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
            <span className="obs-label">TRANSPARENT PROFILE OBSERVATION:</span>
            <p className="obs-text">{profileSummary.observation}</p>
          </div>
        </div>
      )}

      {/* Skills Self-Claimed Ratings Section (0-5 Rating Sliders) */}
      <div className="section-card skills-ratings-card">
        <div className="section-header">
          <div>
            <span className="card-eyebrow">Self-Claimed Proficiency</span>
            <h3 className="section-title">Skill Ratings (0 - 5 Scale)</h3>
          </div>
          <span className="subhead-meta">Adjust sliders to calibrate diagnostic gaps</span>
        </div>

        <div className="skills-sliders-grid">
          {catalog?.skills?.map(skill => {
            const currentVal = ratings[skill.id] || 0;
            return (
              <div key={skill.id} className="skill-slider-row">
                <div className="slider-label-group">
                  <span className="skill-slider-name">{skill.name}</span>
                  <span className="skill-category-badge">{skill.category}</span>
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
                  />
                  <span className={`slider-value-chip level-${currentVal}`}>
                    Level {currentVal}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
