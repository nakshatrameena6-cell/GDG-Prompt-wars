import React, { useState, useCallback } from 'react';
import { QUESTION_BANK } from './data/questions';
import {
  calculateNextDifficulty,
  computeSessionResults,
  TOTAL_QUESTIONS_PER_DRILL
} from './utils/adaptiveEngine';
import StartScreen from './components/StartScreen';
import DrillScreen from './components/DrillScreen';
import TransitionScreen from './components/TransitionScreen';
import ResultScreen from './components/ResultScreen';
import {
  IconLogo,
  IconHome,
  IconDrill,
  IconChart,
  IconSettings,
  IconDiamond,
  IconCoin,
  IconBell,
  IconClock,
  IconBook,
  IconCheckCircle
} from './components/Icons';
import './App.css';

export default function App() {
  // Screen state: 'START' | 'DRILL' | 'TRANSITION' | 'RESULT'
  const [screen, setScreen] = useState('START');
  const [activeNav, setActiveNav] = useState('dashboard');

  // Drill state
  const [currentDifficulty, setCurrentDifficulty] = useState('MEDIUM');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [usedQuestionIds, setUsedQuestionIds] = useState(new Set());
  const [history, setHistory] = useState([]);
  const [pendingTransition, setPendingTransition] = useState(null);
  const [sessionResults, setSessionResults] = useState(null);

  /**
   * Helper to pick an unused question matching the requested difficulty.
   */
  const pickNextQuestion = useCallback((targetDifficulty, excludedIds) => {
    let candidates = QUESTION_BANK.filter(
      q => q.difficulty === targetDifficulty && !excludedIds.has(q.id)
    );

    if (candidates.length === 0) {
      candidates = QUESTION_BANK.filter(q => !excludedIds.has(q.id));
    }

    if (candidates.length === 0) {
      candidates = QUESTION_BANK;
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
  }, []);

  // Launch a fresh drill session
  const handleStartDrill = () => {
    const startingDifficulty = 'MEDIUM';
    const firstQuestion = pickNextQuestion(startingDifficulty, new Set());

    setCurrentDifficulty(startingDifficulty);
    setCurrentQuestion(firstQuestion);
    setQuestionIndex(0);
    setUsedQuestionIds(new Set([firstQuestion.id]));
    setHistory([]);
    setPendingTransition(null);
    setSessionResults(null);
    setScreen('DRILL');
    setActiveNav('drill');
  };

  // Process user answer or timeout
  const handleProcessAnswer = useCallback((answerData) => {
    const { question, selectedOption, isCorrect, responseTime, timedOut, skipped } = answerData;

    const adaptiveResult = calculateNextDifficulty(currentDifficulty, isCorrect, responseTime);

    const record = {
      questionId: question.id,
      category: question.category,
      difficulty: currentDifficulty,
      question: question.question,
      options: question.options,
      answer: question.answer,
      explanation: question.explanation,
      selectedOption,
      isCorrect,
      responseTime,
      timedOut: !!timedOut,
      skipped: !!skipped,
      nextDifficulty: adaptiveResult.nextDifficulty
    };

    const newHistory = [...history, record];
    setHistory(newHistory);

    const transitionPayload = {
      ...adaptiveResult,
      responseTime,
      isCorrect,
      timedOut: !!timedOut,
      isFinalQuestion: newHistory.length >= TOTAL_QUESTIONS_PER_DRILL
    };

    setPendingTransition(transitionPayload);
    setScreen('TRANSITION');
  }, [currentDifficulty, history]);

  // Transition interstitial completed -> show next question or final results
  const handleTransitionComplete = useCallback(() => {
    if (!pendingTransition) return;

    if (pendingTransition.isFinalQuestion) {
      const results = computeSessionResults(history);
      setSessionResults(results);
      setScreen('RESULT');
      setActiveNav('results');
    } else {
      const nextDiff = pendingTransition.nextDifficulty;
      setCurrentDifficulty(nextDiff);

      const nextQ = pickNextQuestion(nextDiff, usedQuestionIds);
      setCurrentQuestion(nextQ);
      setUsedQuestionIds(prev => new Set([...prev, nextQ.id]));
      setQuestionIndex(prev => prev + 1);
      setScreen('DRILL');
    }
  }, [history, pendingTransition, pickNextQuestion, usedQuestionIds]);

  // Reset session and restart
  const handleRestart = () => {
    setScreen('START');
    setActiveNav('dashboard');
  };

  // Header dynamic values based on drill progress
  const progressPercent = screen === 'DRILL'
    ? Math.round(((questionIndex) / TOTAL_QUESTIONS_PER_DRILL) * 100)
    : screen === 'RESULT'
    ? 100
    : 0;

  const displaySpeedIndex = sessionResults ? sessionResults.speedIndex : 78;
  const displayAccuracy = sessionResults ? `${sessionResults.accuracyPercent}%` : '83%';

  return (
    <div className="template-viewport">
      <div className="master-dashboard-container">
        {/* Slim Left Navigation Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-top">
            <IconLogo />

            <nav className="sidebar-nav">
              <button
                type="button"
                className={`sidebar-nav-btn ${activeNav === 'dashboard' ? 'active' : ''}`}
                onClick={() => { setActiveNav('dashboard'); if (screen !== 'DRILL') setScreen('START'); }}
                title="Dashboard Overview"
              >
                <IconHome active={activeNav === 'dashboard'} />
              </button>

              <button
                type="button"
                className={`sidebar-nav-btn ${activeNav === 'drill' ? 'active' : ''}`}
                onClick={() => { if (screen === 'START') handleStartDrill(); else setActiveNav('drill'); }}
                title="Speed Drill"
              >
                <IconDrill />
              </button>

              <button
                type="button"
                className={`sidebar-nav-btn ${activeNav === 'results' ? 'active' : ''}`}
                onClick={() => setActiveNav('results')}
                title="Telemetry & Results"
              >
                <IconChart />
              </button>
            </nav>
          </div>

          <div className="sidebar-bottom">
            <button type="button" className="sidebar-nav-btn" title="Settings">
              <IconSettings />
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-main-panel">
          {/* Top Bar matching template */}
          <header className="dashboard-topbar">
            <div className="topbar-title-group">
              <h1 className="dashboard-heading">
                {screen === 'START' && 'Dashboard'}
                {screen === 'DRILL' && 'Placement Speed Drill'}
                {screen === 'TRANSITION' && 'Calibrating Adaptive Engine'}
                {screen === 'RESULT' && 'Session Performance Debrief'}
              </h1>
              <span className="topbar-subhead">
                {screen === 'DRILL' ? 'Adaptive Aptitude Assessment' : 'QUANTA Placement Speed Drill'}
              </span>
            </div>

            <div className="topbar-telemetry-chips">
              <div className="telemetry-chip chip-cyan" title="Estimated Speed Index">
                <span className="chip-icon"><IconDiamond /></span>
                <span className="chip-val mono">{displaySpeedIndex}</span>
              </div>

              <div className="telemetry-chip chip-amber" title="Accuracy Benchmark">
                <span className="chip-icon"><IconCoin /></span>
                <span className="chip-val mono">{displayAccuracy}</span>
              </div>

              <div className="notification-bell-btn">
                <IconBell />
                <span className="bell-badge-dot"></span>
              </div>
            </div>
          </header>

          {/* Top 3 Stat Cards (Identical layout to template image) */}
          <section className="top-stat-cards-grid">
            {/* Card 1: Completed / Progress */}
            <div className="stat-card card-blue-tint">
              <div className="stat-card-header">
                <span className="stat-card-title">Completed</span>
                <span className="stat-card-icon-wrap icon-blue">
                  <IconCheckCircle />
                </span>
              </div>
              <div className="stat-card-val-row">
                <span className="stat-large-num mono">
                  {screen === 'DRILL' ? `${progressPercent}%` : screen === 'RESULT' ? '100%' : '56%'}
                </span>
                <span className="stat-subtext mono">
                  {screen === 'DRILL' ? `0${questionIndex + 1}/06` : 'Target: 06/06'}
                </span>
              </div>
            </div>

            {/* Card 2: Adaptive Tier */}
            <div className="stat-card card-purple-tint">
              <div className="stat-card-header">
                <span className="stat-card-title">Adaptive Tier</span>
                <span className="stat-card-icon-wrap icon-purple">
                  <IconBook />
                </span>
              </div>
              <div className="stat-card-val-row">
                <span className="stat-large-num stat-tier-text">
                  {currentDifficulty}
                </span>
                <span className="stat-subtext">Live Engine</span>
              </div>
            </div>

            {/* Card 3: Pacing Timer */}
            <div className="stat-card card-pink-tint">
              <div className="stat-card-header">
                <span className="stat-card-title">Pacing Target</span>
                <span className="stat-card-icon-wrap icon-pink">
                  <IconClock />
                </span>
              </div>
              <div className="stat-card-val-row">
                <span className="stat-large-num mono">
                  {screen === 'DRILL' ? '25s' : '08.5s'}
                </span>
                <span className="stat-subtext mono">
                  {screen === 'DRILL' ? 'Per Question' : 'Fast Threshold'}
                </span>
              </div>
            </div>
          </section>

          {/* Dynamic Content Views */}
          <div className="dashboard-content-area">
            {screen === 'START' && (
              <StartScreen onStart={handleStartDrill} />
            )}

            {(screen === 'DRILL' || screen === 'TRANSITION') && currentQuestion && (
              <>
                <DrillScreen
                  questionIndex={questionIndex}
                  totalQuestions={TOTAL_QUESTIONS_PER_DRILL}
                  currentDifficulty={currentDifficulty}
                  question={currentQuestion}
                  history={history}
                  onAnswer={handleProcessAnswer}
                  onSkip={handleProcessAnswer}
                />
                {screen === 'TRANSITION' && pendingTransition && (
                  <TransitionScreen
                    transitionData={pendingTransition}
                    onComplete={handleTransitionComplete}
                  />
                )}
              </>
            )}

            {screen === 'RESULT' && sessionResults && (
              <ResultScreen
                sessionResults={sessionResults}
                history={history}
                onRestart={handleRestart}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
