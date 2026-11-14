import React, { useState } from 'react';
import { sendMentorQuery } from '../api';

export default function MentorView({ profileId, state }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'mentor',
      text: (
        state?.agent_orchestration?.career_matcher?.alignment ||
        "Hello! I am your QUANTA AI Mentor. I review your active roadmap modules, assessment telemetry, and career goals to provide targeted preparation guidance."
      ),
      nextStep: "Complete your active roadmap modules or take the technical assessment to calibrate verified proficiency.",
      encouragement: "Consistency in code tracing and daily deliberate practice builds senior-level confidence."
    }
  ]);

  const handleSend = async (userText) => {
    const textToSend = userText || query;
    if (!textToSend.trim() || loading) return;

    const newMsg = { sender: 'user', text: textToSend };
    setMessages(prev => [...prev, newMsg]);
    setQuery('');
    setLoading(true);

    try {
      const data = await sendMentorQuery(textToSend, profileId);
      const mentorResp = data.mentor_response || {};
      setMessages(prev => [
        ...prev,
        {
          sender: 'mentor',
          text: mentorResp.advice || "Focus on building complete end-to-end projects demonstrating your active skills.",
          nextStep: mentorResp.next_step,
          encouragement: mentorResp.encouragement,
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'mentor',
          text: `[Offline Fallback] Focus on completing your active roadmap modules: ${state?.roadmap?.filter(m => m.status === 'active').map(m => m.skill_name).join(', ') || 'Core Skills'}.`,
          nextStep: "Review the curated MDN and official documentation links attached to each roadmap item.",
          encouragement: "Every completed module directly elevates your placement readiness percentage!"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "How should I prioritize my active roadmap modules?",
    "Explain the difference between Full Stack Developer and ML Engineer.",
    "What coding habits prevent careless assessment errors?",
    "How do I prepare for Node.js event loop interview questions?"
  ];

  return (
    <div className="mentor-view-container">
      <div className="section-card mentor-header-card">
        <div className="placeholder-badge-row">
          <span className="mission-tag tag-amber">ON-DEMAND AI MENTOR</span>
          <span className="mission-tag">CAREER COACHING</span>
        </div>
        <h2 className="placeholder-title">Personalized Placement Guidance</h2>
        <p className="placeholder-desc">
          Get actionable feedback tailored to your current target role ({state?.role?.title}), verified skill deficits, and roadmap bottlenecks.
        </p>

        {/* Quick Prompts */}
        <div className="quick-prompts-row">
          <span className="quick-prompts-label">Suggested Inquiries:</span>
          <div className="prompt-pills-wrap">
            {quickPrompts.map((p, i) => (
              <button
                key={i}
                type="button"
                className="prompt-pill-btn"
                onClick={() => handleSend(p)}
                disabled={loading}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="mentor-conversation-card section-card">
        <div className="messages-stream">
          {messages.map((m, idx) => (
            <div key={idx} className={`message-bubble-wrapper ${m.sender}`}>
              <div className="message-sender-tag">
                {m.sender === 'mentor' ? '🤖 QUANTA AI MENTOR' : '👤 YOU'}
              </div>
              <div className="message-content">
                <p className="message-text">{m.text}</p>
                {m.nextStep && (
                  <div className="mentor-callout next-step-callout">
                    <span className="callout-lbl">ACTIONABLE NEXT STEP:</span>
                    <p>{m.nextStep}</p>
                  </div>
                )}
                {m.encouragement && (
                  <div className="mentor-callout encouragement-callout">
                    <span className="callout-lbl">MENTOR NOTE:</span>
                    <p>{m.encouragement}</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-bubble-wrapper mentor">
              <div className="message-sender-tag">🤖 QUANTA AI MENTOR</div>
              <div className="message-content">
                <p className="message-text typing-text">Generating targeted career guidance...</p>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="mentor-input-row">
          <input
            type="text"
            className="form-input mentor-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Ask mentor for technical advice, interview tactics, or roadmap guidance..."
            disabled={loading}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleSend()}
            disabled={loading || !query.trim()}
          >
            Send ➔
          </button>
        </div>
      </div>
    </div>
  );
}
