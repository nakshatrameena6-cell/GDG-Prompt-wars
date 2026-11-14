import React, { useState, useEffect } from 'react';
import { fetchAgentTimeline } from '../api';

export default function AgentsView({ profileId, state }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTimeline = () => {
    setLoading(true);
    fetchAgentTimeline(profileId)
      .then(data => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load agent timeline:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadTimeline();
  }, [profileId]);

  const orchestration = state?.agent_orchestration || {};
  const reconciliation = orchestration.reconciliation;

  const agentsRoster = [
    {
      name: "Profile Analyst",
      role: "Interprets student interests, claimed skills, and strengths.",
      status: "Active",
      badge: "Diagnostic"
    },
    {
      name: "Career Matcher",
      role: "Evaluates fit against target roles and highlights prerequisite risks.",
      status: "Active",
      badge: "Intelligence"
    },
    {
      name: "Skill Auditor",
      role: "Audits empirical assessment verification vs unverified claims.",
      status: "Active",
      badge: "Verification"
    },
    {
      name: "Weakness Detective",
      role: "Investigates response time telemetry, difficulty, and error tags.",
      status: "Active",
      badge: "Root-Cause"
    },
    {
      name: "Curriculum Planner",
      role: "Sequences roadmap modules and enforces strict prerequisite DAG.",
      status: "Active",
      badge: "Planning"
    },
    {
      name: "AI Mentor",
      role: "Provides contextual placement coaching and interview preparation.",
      status: "Standby (On-Demand)",
      badge: "Guidance"
    }
  ];

  return (
    <div className="agents-view-container">
      {/* Agents Roster Card */}
      <div className="section-card agents-roster-card">
        <div className="placeholder-badge-row">
          <span className="mission-tag tag-amber">MULTI-AGENT COLLABORATION</span>
          <span className="mission-tag">BACKEND PERSISTENCE</span>
        </div>
        <h2 className="placeholder-title">Autonomous Career Intelligence Roster</h2>
        <p className="placeholder-desc">
          Six specialized AI agents collaborate across diagnostic evaluation, skill auditing, root-cause detection, and roadmap orchestration.
        </p>

        <div className="roster-grid">
          {agentsRoster.map((ag, i) => (
            <div key={i} className="agent-card">
              <div className="agent-card-header">
                <span className="agent-name">{ag.name}</span>
                <span className="agent-type-badge">{ag.badge}</span>
              </div>
              <p className="agent-role-text">{ag.role}</p>
              <div className="agent-status-row">
                <span className="agent-status-dot"></span>
                <span className="agent-status-text">{ag.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Discrepancy & Reconciliation Card */}
      {reconciliation && (
        <div className="section-card reconciliation-card">
          <div className="section-header">
            <div>
              <span className="card-eyebrow">Orchestrator Conflict Resolution</span>
              <h3 className="section-title">Agent Discrepancy Reconciled</h3>
            </div>
            <span className="reconciled-pill">✓ Resolved</span>
          </div>
          <div className="reconciliation-body">
            <div className="reconciliation-item conflict-item">
              <span className="recon-label">DISCREPANCY DETECTED:</span>
              <p>{reconciliation.conflict}</p>
            </div>
            <div className="reconciliation-item resolution-item">
              <span className="recon-label">ORCHESTRATOR RESOLUTION:</span>
              <p>{reconciliation.resolution}</p>
            </div>
          </div>
        </div>
      )}

      {/* Live Agent Activity Timeline */}
      <div className="section-card timeline-card">
        <div className="section-header">
          <div>
            <span className="card-eyebrow">Backend Event Log</span>
            <h3 className="section-title">Actual Agent Execution Timeline</h3>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={loadTimeline}
            disabled={loading}
          >
            🔄 Refresh Events
          </button>
        </div>

        {loading ? (
          <p className="loading-text">Loading agent events from database...</p>
        ) : events.length === 0 ? (
          <p className="empty-events-text">No agent events recorded yet. Run an assessment or change goals to trigger agent activity.</p>
        ) : (
          <div className="timeline-events-list">
            {events.map((ev) => (
              <div key={ev.id} className="timeline-event-row">
                <div className="event-left-meta">
                  <span className="event-agent-name">{ev.agent_name}</span>
                  <span className={`event-type-badge type-${ev.event_type.replace(' ', '-')}`}>
                    {ev.event_type}
                  </span>
                </div>
                <div className="event-detail-box">
                  <p className="event-detail-text">{ev.details}</p>
                  <span className="event-timestamp mono">{ev.created_at}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
