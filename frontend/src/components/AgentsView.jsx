import React, { useState, useEffect } from 'react';
import { fetchAgentTimeline } from '../api';
import { IconUser, IconCompass, IconShield, IconSearch, IconRoadmap, IconMentor, IconRefresh } from './Icons';

export default function AgentsView({ profileId, state }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState('ALL');

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
      role: "Interprets student interests, claimed competencies, and qualitative observations.",
      status: "Active",
      badge: "Diagnostic",
      icon: <IconUser />
    },
    {
      name: "Career Matcher",
      role: "Evaluates fit against target career catalogues and quantifies readiness deficits.",
      status: "Active",
      badge: "Intelligence",
      icon: <IconCompass />
    },
    {
      name: "Skill Auditor",
      role: "Audits empirical test performance against self-reported ratings and flags overconfidence.",
      status: "Active",
      badge: "Verification",
      icon: <IconShield />
    },
    {
      name: "Weakness Detective",
      role: "Investigates response latency telemetry, difficulty tiers, and error tag attributions.",
      status: "Active",
      badge: "Root-Cause",
      icon: <IconSearch />
    },
    {
      name: "Curriculum Planner",
      role: "Sequences roadmap modules in topological DAG order and assigns adaptive priority.",
      status: "Active",
      badge: "Planning",
      icon: <IconRoadmap />
    },
    {
      name: "AI Mentor",
      role: "Synthesizes multi-agent signals to deliver strategic placement coaching and advice.",
      status: "Standby (On-Demand)",
      badge: "Guidance",
      icon: <IconMentor />
    }
  ];

  const filteredEvents = events.filter(ev => {
    if (eventFilter === 'CONFLICTS') return ev.event_type.includes('conflict');
    if (eventFilter === 'ANALYSIS') return ev.event_type.includes('analysis');
    if (eventFilter === 'GOALS') return ev.event_type.includes('goal');
    if (eventFilter === 'FALLBACKS') return ev.event_type.includes('fallback');
    return true;
  });

  return (
    <div className="agents-view-container">
      {/* Agents Roster Card */}
      <div className="section-card agents-roster-card">
        <div className="card-badge-row">
          <span className="pill-badge pill-badge-indigo">MULTI-AGENT COLLABORATION</span>
          <span className="pill-badge pill-badge-emerald">PERSISTENT TELEMETRY</span>
        </div>
        <h2 className="section-title">Autonomous Career Intelligence Roster</h2>
        <p className="section-subtitle">
          Six specialized AI agents collaborate across profile diagnostics, empirical verification, root-cause detection, and topological roadmap orchestration.
        </p>

        <div className="roster-grid">
          {agentsRoster.map((ag, i) => (
            <div key={i} className="agent-card">
              <div className="agent-card-header">
                <div className="agent-icon-name-row">
                  <span className="agent-avatar-icon">{ag.icon}</span>
                  <span className="agent-name">{ag.name}</span>
                </div>
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
              <span className="card-eyebrow">ORCHESTRATOR RECONCILIATION</span>
              <h3 className="section-title">Audited Discrepancy Resolved</h3>
            </div>
            <span className="reconciled-pill">✓ Resolved by Orchestrator</span>
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
            <span className="card-eyebrow">PERSISTED EVENT AUDIT</span>
            <h3 className="section-title">Real Agent Execution Timeline</h3>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={loadTimeline}
            disabled={loading}
          >
            <IconRefresh />
            <span>{loading ? 'Refreshing...' : 'Refresh Events'}</span>
          </button>
        </div>

        {/* Timeline Event Filters */}
        <div className="timeline-filter-row">
          <span className="filter-label">Filter Events:</span>
          <div className="filter-pills-wrap">
            <button
              type="button"
              className={`filter-pill-btn ${eventFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setEventFilter('ALL')}
            >
              All Events ({events.length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${eventFilter === 'ANALYSIS' ? 'active' : ''}`}
              onClick={() => setEventFilter('ANALYSIS')}
            >
              Analyses
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${eventFilter === 'CONFLICTS' ? 'active' : ''}`}
              onClick={() => setEventFilter('CONFLICTS')}
            >
              Conflicts & Reconciliations
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${eventFilter === 'GOALS' ? 'active' : ''}`}
              onClick={() => setEventFilter('GOALS')}
            >
              Goal Switches
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${eventFilter === 'FALLBACKS' ? 'active' : ''}`}
              onClick={() => setEventFilter('FALLBACKS')}
            >
              Fallbacks
            </button>
          </div>
        </div>

        {loading ? (
          <p className="loading-text">Loading agent events from database...</p>
        ) : filteredEvents.length === 0 ? (
          <div className="empty-events-box">
            <p className="empty-events-text">
              No agent events recorded for the selected filter. Run a technical assessment or change goals to trigger multi-agent analysis.
            </p>
          </div>
        ) : (
          <div className="timeline-events-list">
            {filteredEvents.map((ev) => (
              <div key={ev.id} className="timeline-event-row">
                <div className="event-left-meta">
                  <span className="event-agent-name">{ev.agent_name}</span>
                  <span className={`event-type-badge type-${ev.event_type.replace(/_/g, '-')}`}>
                    {ev.event_type.replace(/_/g, ' ')}
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
