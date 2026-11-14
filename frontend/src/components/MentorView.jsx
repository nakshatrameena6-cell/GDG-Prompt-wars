import React, { useState, useRef, useEffect } from 'react';
import { sendMentorQuery } from '../api';
import { IconSparkles } from './Icons';

export default function MentorView({ profileId, state }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      sender: 'mentor',
      text: (
        state?.agent_orchestration?.career_matcher?.alignment ||
        `Hello! I am your QUANTA AI Mentor. I review your active roadmap modules for ${state?.role?.title || 'your target career'}, diagnostic assessment telemetry, and skill gaps to provide targeted placement preparation advice.`
      ),
      nextStep: "Complete your active roadmap modules or take the technical skill assessment to calibrate verified proficiency.",
      encouragement: "Consistency in deliberate practice and code tracing builds senior-level problem solving confidence."
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

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
    "Explain the skill difference between Full Stack Developer and ML Engineer.",
    "What coding habits prevent careless assessment errors?",
    "How do I prepare for Node.js event loop interview questions?"
  ];

  return (
    <div className="mentor-view-container">
      {/* Mentor Header Card */}
      <div className="section-card mentor-header-card">
        <div className="card-badge-row">
          <span className="pill-badge pill-badge-indigo">ON-DEMAND AI MENTOR</span>
          <span className="pill-badge pill-badge-emerald">CAREER STRATEGY</span>
        </div>
        <h2 className="section-title">Personalized Placement Coach</h2>
        <p className="section-subtitle">
          Get actionable feedback tailored to your current target role (<strong>{state?.role?.title}</strong>), verified skill deficits, and roadmap bottlenecks.
        </p>

        {/* Quick Prompts */}
        <div className="quick-prompts-row">
          <span className="quick-prompts-label">Suggested Coaching Inquiries:</span>
          <div className="prompt-pills-wrap">
            {quickPrompts.map((p, i) => (
              <button
                key={i}
                type="button"
                className="prompt-pill-btn"
                onClick={() => handleSend(p)}
                disabled={loading}
              >
                <IconSparkles />
                <span>{p}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Messages Conversation Stream */}
      <div className="mentor-conversation-card section-card">
        <div className="messages-stream" aria-live="polite" aria-relevant="additions" role="log">
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
            <div className="message-bubble-wrapper mentor" role="status" aria-label="AI mentor is typing">
              <div className="message-sender-tag">🤖 QUANTA AI MENTOR</div>
              <div className="message-content">
                <div className="typing-indicator-row">
                  <span className="typing-dot" aria-hidden="true"></span>
                  <span className="typing-dot" aria-hidden="true"></span>
                  <span className="typing-dot" aria-hidden="true"></span>
                  <span className="typing-label">Analyzing profile telemetry and formulating advice...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="mentor-input-row" role="form" aria-label="Mentor message form">
          <input
            type="text"
            className="form-input mentor-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Ask mentor for technical advice, interview tactics, or roadmap guidance..."
            disabled={loading}
            aria-label="Message inquiry for AI mentor"
          />
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleSend()}
            disabled={loading || !query.trim()}
            aria-label="Send message to mentor"
          >
            <span>Send ➔</span>
          </button>
        </div>
      </div>
    </div>
  );
}
