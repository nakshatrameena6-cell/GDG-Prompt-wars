import React, { useState } from 'react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const EXAMPLE_QUERIES = [
  "I am weak in quantitative aptitude.",
  "I need help preparing for DSA coding interviews.",
  "How should I practice for behavioral HR rounds?"
];

function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) {
      setError("Please enter a placement preparation topic or weakness to analyze.");
      setResponse(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data?.message || `Server returned error (${res.status})`;
        setError(errorMsg);
      } else {
        setResponse(data);
      }
    } catch (err) {
      console.error("Network or fetch error:", err);
      setError(
        "Failed to connect to the backend server. Please verify the FastAPI backend is running on http://localhost:8000."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExample = (exampleText) => {
    setQuery(exampleText);
    setError(null);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-badge">
          <span className="dot"></span>
          <span>Phase 1 — Project Skeleton</span>
        </div>
        <h1 className="app-title">PlacementPilot</h1>
        <p className="app-description">
          Reimagining placement preparation for students. Enter your focus area, weakness, or query
          below to test the end-to-end Gemini AI diagnostic pipeline.
        </p>
      </header>

      {/* Gemini Test Section */}
      <main className="card" id="gemini-test-section">
        <div className="section-label">
          <span>AI Pipeline Verification</span>
        </div>

        {/* Example Prompt Chips */}
        <div className="chips-container">
          {EXAMPLE_QUERIES.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="chip-btn"
              onClick={() => handleSelectExample(item)}
              disabled={loading}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleAnalyze}>
          <div className="input-group">
            <textarea
              id="query-input"
              className="query-textarea"
              placeholder="Enter your placement query or weakness (e.g., I am weak in quantitative aptitude.)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              rows={4}
            />
          </div>

          <div className="actions-row">
            <button
              id="test-ai-btn"
              type="submit"
              className="submit-btn"
              disabled={loading || !query.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  <span>Analyzing with AI...</span>
                </>
              ) : (
                <span>Test AI</span>
              )}
            </button>
          </div>
        </form>

        {/* Error Display Area */}
        {error && (
          <div className="error-banner" id="error-container">
            <span className="error-icon">⚠️</span>
            <div className="error-content">
              <div className="error-title">Request Failed</div>
              <div className="error-message">{error}</div>
            </div>
          </div>
        )}

        {/* Response Display Area */}
        {response && (
          <div className="response-container" id="response-container">
            <div className="response-card">
              <div className="response-header">
                <span className={`status-badge ${response.status}`}>
                  ✓ Status: {response.status}
                </span>
                <span className="model-tag">Gemini API Pipeline</span>
              </div>
              <div className="response-text" id="ai-response-message">
                {response.message}
              </div>
              <div className="response-json-preview">
                <strong>Structured JSON:</strong>
                <pre>{JSON.stringify(response, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        PlacementPilot &bull; Hackathon Foundation &bull; Phase 1 Complete
      </footer>
    </div>
  );
}

export default App;
