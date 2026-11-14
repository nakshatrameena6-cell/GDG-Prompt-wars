import React, { useState, useEffect, useCallback } from 'react';
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
import ProfileView from './components/ProfileView';
import GapsView from './components/GapsView';
import RoadmapView from './components/RoadmapView';
import PlaceholderView from './components/PlaceholderView';
import {
  fetchCatalog,
  fetchState,
  updateProfile,
  changeGoal,
  completeModule,
  seedDemo
} from './api';
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
  IconCheckCircle,
  IconUser,
  IconGaps,
  IconRoadmap,
  IconAgents,
  IconMentor
} from './components/Icons';
import './App.css';

export default function App() {
  // Screen state: 'MAIN' | 'DRILL' | 'TRANSITION' | 'RESULT'
  const [screen, setScreen] = useState('MAIN');
  // Navigation: 'profile' | 'gaps' | 'roadmap' | 'assessment' | 'mentor' | 'agents'
  const [activeNav, setActiveNav] = useState('gaps');

  // Backend state
  const [catalog, setCatalog] = useState(null);
  const [appState, setAppState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [completingModuleId, setCompletingModuleId] = useState(null);

  // Drill state (left untouched)
  const [currentDifficulty, setCurrentDifficulty] = useState('MEDIUM');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [usedQuestionIds, setUsedQuestionIds] = useState(new Set());
  const [history, setHistory] = useState([]);
  const [pendingTransition, setPendingTransition] = useState(null);
  const [sessionResults, setSessionResults] = useState(null);

  // Load initial backend state and catalog
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(null);
      const [catData, stateData] = await Promise.all([
        fetchCatalog(),
        fetchState()
      ]);
      setCatalog(catData);
      setAppState(stateData);
    } catch (err) {
      console.error('Failed to load application data:', err);
      setApiError(err.message || 'Unable to connect to backend API.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Profile update handler
  const handleUpdateProfile = async (payload) => {
    try {
      setLoading(true);
      const updatedState = await updateProfile(payload, appState?.profile?.id);
      setAppState(updatedState);
    } catch (err) {
      alert(`Error updating profile: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Seed sample student handler
  const handleLoadSampleStudent = async () => {
    try {
      setLoading(true);
      const res = await seedDemo();
      if (res?.state) {
        setAppState(res.state);
      } else {
        await loadInitialData();
      }
    } catch (err) {
      alert(`Error seeding sample student: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Target goal change handler
  const handleGoalChange = async (newGoal) => {
    try {
      setLoading(true);
      const updatedState = await changeGoal(newGoal, appState?.profile?.id);
      setAppState(updatedState);
    } catch (err) {
      alert(`Error updating goal: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Module completion handler
  const handleCompleteModule = async (moduleId) => {
    try {
      setCompletingModuleId(moduleId);
      const updatedState = await completeModule(moduleId, appState?.profile?.id);
      setAppState(updatedState);
    } catch (err) {
      alert(`Error completing module: ${err.message}`);
    } finally {
      setCompletingModuleId(null);
    }
  };

  // Pick an unused question matching requested difficulty for speed drill
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

  // Launch fresh drill session
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
  };

  // Process user answer or timeout in drill
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

  // Reset drill session and return to main dashboard
  const handleRestartDrill = () => {
    setScreen('MAIN');
  };

  // Dynamic real state values replacing all hardcoded statistics
  const totalModules = appState?.roadmap?.length || 0;
  const doneModules = appState?.roadmap?.filter(m => m.status === 'done').length || 0;
  const roadmapCompletionPercent = totalModules > 0
    ? Math.round((doneModules / totalModules) * 100)
    : 0;

  const realReadiness = appState?.readiness ?? 0;
  const realCoverage = appState?.verification_coverage ?? 0;
  const realGapsCount = appState?.gap_skills?.length ?? 0;
  const targetRoleTitle = appState?.role?.title || 'Full Stack Developer';

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
                className={`sidebar-nav-btn ${activeNav === 'profile' && screen === 'MAIN' ? 'active' : ''}`}
                onClick={() => { setActiveNav('profile'); setScreen('MAIN'); }}
                title="Profile"
              >
                <IconUser />
              </button>

              <button
                type="button"
                className={`sidebar-nav-btn ${activeNav === 'gaps' && screen === 'MAIN' ? 'active' : ''}`}
                onClick={() => { setActiveNav('gaps'); setScreen('MAIN'); }}
                title="Gaps"
              >
                <IconGaps />
              </button>

              <button
                type="button"
                className={`sidebar-nav-btn ${activeNav === 'roadmap' && screen === 'MAIN' ? 'active' : ''}`}
                onClick={() => { setActiveNav('roadmap'); setScreen('MAIN'); }}
                title="Roadmap"
              >
                <IconRoadmap />
              </button>

              <button
                type="button"
                className={`sidebar-nav-btn ${activeNav === 'assessment' || screen === 'DRILL' ? 'active' : ''}`}
                onClick={() => { setActiveNav('assessment'); setScreen('MAIN'); }}
                title="Assessment"
              >
                <IconDrill />
              </button>

              <button
                type="button"
                className={`sidebar-nav-btn ${activeNav === 'mentor' && screen === 'MAIN' ? 'active' : ''}`}
                onClick={() => { setActiveNav('mentor'); setScreen('MAIN'); }}
                title="Mentor"
              >
                <IconMentor />
              </button>

              <button
                type="button"
                className={`sidebar-nav-btn ${activeNav === 'agents' && screen === 'MAIN' ? 'active' : ''}`}
                onClick={() => { setActiveNav('agents'); setScreen('MAIN'); }}
                title="Agents"
              >
                <IconAgents />
              </button>
            </nav>
          </div>

          <div className="sidebar-bottom">
            <button
              type="button"
              className="sidebar-nav-btn"
              title="Reload Data"
              onClick={loadInitialData}
            >
              <IconSettings />
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-main-panel">
          {/* Top Bar with Real Dynamic State Values */}
          <header className="dashboard-topbar">
            <div className="topbar-title-group">
              <h1 className="dashboard-heading">
                {screen === 'DRILL' && 'Placement Speed Drill'}
                {screen === 'TRANSITION' && 'Calibrating Adaptive Engine'}
                {screen === 'RESULT' && 'Session Performance Debrief'}
                {screen === 'MAIN' && (
                  activeNav === 'profile' ? 'Learner Profile' :
                  activeNav === 'gaps' ? 'Skill Gap Analysis' :
                  activeNav === 'roadmap' ? 'Learning Roadmap' :
                  activeNav === 'assessment' ? 'Skill Assessment' :
                  activeNav === 'mentor' ? 'AI Mentor' : 'Agentic System'
                )}
              </h1>
              <span className="topbar-subhead">
                {appState?.profile?.name ? `Student: ${appState.profile.name}` : 'PlacementPilot Diagnostic Platform'}
              </span>
            </div>

            <div className="topbar-telemetry-chips">
              <div className="telemetry-chip chip-cyan" title="Role Readiness Metric">
                <span className="chip-icon"><IconDiamond /></span>
                <span className="chip-val mono">{realReadiness}% Readiness</span>
              </div>

              <div className="telemetry-chip chip-amber" title="Assessment Verification Coverage">
                <span className="chip-icon"><IconCoin /></span>
                <span className="chip-val mono">{realCoverage}% Verified</span>
              </div>

              <div className="notification-bell-btn" title="System Active">
                <IconBell />
                <span className="bell-badge-dot"></span>
              </div>
            </div>
          </header>

          {/* Navigation Bar: Profile | Gaps | Roadmap | Assessment | Mentor | Agents */}
          <nav className="dashboard-subnav-bar">
            {[
              { id: 'profile', label: 'Profile' },
              { id: 'gaps', label: 'Gaps' },
              { id: 'roadmap', label: 'Roadmap' },
              { id: 'assessment', label: 'Assessment' },
              { id: 'mentor', label: 'Mentor' },
              { id: 'agents', label: 'Agents' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`subnav-tab-btn ${activeNav === tab.id && screen === 'MAIN' ? 'active' : ''}`}
                onClick={() => {
                  setActiveNav(tab.id);
                  setScreen('MAIN');
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Real Dynamic Header Stat Cards (Replacing ALL hardcoded 78, 83%, 56%, 0X/06) */}
          <section className="top-stat-cards-grid">
            {/* Card 1: Completed Roadmap Modules */}
            <div className="stat-card card-blue-tint">
              <div className="stat-card-header">
                <span className="stat-card-title">Roadmap Progress</span>
                <span className="stat-card-icon-wrap icon-blue">
                  <IconCheckCircle />
                </span>
              </div>
              <div className="stat-card-val-row">
                <span className="stat-large-num mono">{roadmapCompletionPercent}%</span>
                <span className="stat-subtext mono">
                  {doneModules}/{totalModules} Modules Done
                </span>
              </div>
            </div>

            {/* Card 2: Career Target */}
            <div className="stat-card card-purple-tint">
              <div className="stat-card-header">
                <span className="stat-card-title">Career Target</span>
                <span className="stat-card-icon-wrap icon-purple">
                  <IconBook />
                </span>
              </div>
              <div className="stat-card-val-row">
                <span className="stat-large-num stat-tier-text">
                  {targetRoleTitle}
                </span>
                <span className="stat-subtext">Active Role Objective</span>
              </div>
            </div>

            {/* Card 3: Skill Gaps Deficit */}
            <div className="stat-card card-pink-tint">
              <div className="stat-card-header">
                <span className="stat-card-title">Skill Gaps</span>
                <span className="stat-card-icon-wrap icon-pink">
                  <IconClock />
                </span>
              </div>
              <div className="stat-card-val-row">
                <span className="stat-large-num mono">{realGapsCount}</span>
                <span className="stat-subtext mono">Deficits To Close</span>
              </div>
            </div>
          </section>

          {/* Dynamic Content Views */}
          <div className="dashboard-content-area">
            {apiError && (
              <div className="alert-error-banner">
                ⚠️ {apiError} — Make sure the backend server is running on port 8000.
              </div>
            )}

            {/* MAIN Views: Profile | Gaps | Roadmap | Assessment | Mentor | Agents */}
            {screen === 'MAIN' && activeNav === 'profile' && (
              <ProfileView
                profile={appState?.profile}
                catalog={catalog}
                userSkills={appState?.skills?.reduce((acc, s) => {
                  acc[s.skill_id] = { claimed_level: s.claimed, verified_level: s.verified };
                  return acc;
                }, {})}
                onUpdateProfile={handleUpdateProfile}
                onLoadSampleStudent={handleLoadSampleStudent}
                onGoalChange={handleGoalChange}
                loading={loading}
              />
            )}

            {screen === 'MAIN' && activeNav === 'gaps' && (
              <GapsView state={appState} />
            )}

            {screen === 'MAIN' && activeNav === 'roadmap' && (
              <RoadmapView
                state={appState}
                onCompleteModule={handleCompleteModule}
                completingModuleId={completingModuleId}
              />
            )}

            {screen === 'MAIN' && activeNav === 'assessment' && (
              <PlaceholderView
                viewType="assessment"
                onLaunchDrill={handleStartDrill}
              />
            )}

            {screen === 'MAIN' && activeNav === 'mentor' && (
              <PlaceholderView viewType="mentor" />
            )}

            {screen === 'MAIN' && activeNav === 'agents' && (
              <PlaceholderView viewType="agents" />
            )}

            {/* Speed Drill Screens (Untouched components) */}
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
                onRestart={handleRestartDrill}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
