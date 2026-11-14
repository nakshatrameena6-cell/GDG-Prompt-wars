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
import AssessmentView from './components/AssessmentView';
import MentorView from './components/MentorView';
import AgentsView from './components/AgentsView';
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
  IconDrill,
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
  IconMentor,
  IconRefresh,
  IconMenu,
  IconClose,
  IconSettings
} from './components/Icons';
import './App.css';

export default function App() {
  // Screen state: 'MAIN' | 'DRILL' | 'TRANSITION' | 'RESULT'
  const [screen, setScreen] = useState('MAIN');
  // Navigation: 'profile' | 'gaps' | 'roadmap' | 'assessment' | 'mentor' | 'agents'
  const [activeNav, setActiveNav] = useState('profile');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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
      showToast('Profile and competency ratings updated successfully!');
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
      showToast('Sample Student profile loaded (Python 3, SQL 3, HTML/CSS 2)!');
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
      showToast(`Target goal updated to ${catalog?.roles?.find(r => r.id === newGoal)?.title || newGoal}!`);
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
      showToast('Module marked as completed! Downstream modules unlocked.');
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

  // Real state values
  const totalModules = appState?.roadmap?.length || 0;
  const doneModules = appState?.roadmap?.filter(m => m.status === 'done').length || 0;
  const roadmapCompletionPercent = totalModules > 0
    ? Math.round((doneModules / totalModules) * 100)
    : 0;

  const realReadiness = appState?.readiness ?? 0;
  const realCoverage = appState?.verification_coverage ?? 0;
  const realGapsCount = appState?.gap_skills?.length ?? 0;
  const targetRoleTitle = appState?.role?.title || 'Full Stack Developer';
  const studentName = appState?.profile?.name || 'Student';

  // Navigation Items
  const navItems = [
    { id: 'profile', label: 'Dashboard & Profile', icon: <IconUser /> },
    { id: 'gaps', label: 'Skill Gaps', icon: <IconGaps /> },
    { id: 'roadmap', label: 'Learning Roadmap', icon: <IconRoadmap /> },
    { id: 'assessment', label: 'Assessment', icon: <IconDrill /> },
    { id: 'mentor', label: 'AI Mentor', icon: <IconMentor /> },
    { id: 'agents', label: 'Agent Activity', icon: <IconAgents /> },
  ];

  const getPageInfo = () => {
    if (screen === 'DRILL') return { title: 'Placement Speed Drill', desc: 'Real-time adaptive difficulty technical speed challenge' };
    if (screen === 'TRANSITION') return { title: 'Calibrating Difficulty', desc: 'Analyzing response telemetry and adjusting question tier' };
    if (screen === 'RESULT') return { title: 'Performance Debrief', desc: 'Empirical telemetry breakdown and recommendation insights' };

    switch (activeNav) {
      case 'profile':
        return {
          title: 'Career Dashboard & Profile',
          desc: 'Calibrate claimed ratings, review profile intelligence, and manage target goals'
        };
      case 'gaps':
        return {
          title: 'Skill Gap Analysis',
          desc: 'Empirical comparison of self-reported vs verified proficiencies'
        };
      case 'roadmap':
        return {
          title: 'Personalized Learning Roadmap',
          desc: 'Topologically sequenced modules with prerequisite validation'
        };
      case 'assessment':
        return {
          title: 'Technical Skill Assessment',
          desc: '15-question calibrated evaluation with telemetry scoring'
        };
      case 'mentor':
        return {
          title: 'AI Placement Mentor',
          desc: 'Context-aware coaching and strategic interview preparation'
        };
      case 'agents':
        return {
          title: 'Autonomous Agent System',
          desc: 'Multi-agent coordination, discrepancy auditing, and execution timeline'
        };
      default:
        return { title: 'QUANTA Platform', desc: 'AI-Powered Career Intelligence' };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <div className="template-viewport">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <span>✓ {toastMessage}</span>
        </div>
      )}

      <div className="master-dashboard-container">
        {/* Backdrop for mobile drawer */}
        {mobileMenuOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Modern SaaS Left Sidebar */}
        <aside className={`dashboard-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-top">
            <div className="sidebar-brand-block">
              <IconLogo />
              <div className="brand-text-block">
                <span className="brand-title">QUANTA</span>
                <span className="brand-tag">Career Intelligence</span>
              </div>
              <button
                type="button"
                className="mobile-close-btn"
                onClick={() => setMobileMenuOpen(false)}
              >
                <IconClose />
              </button>
            </div>

            <nav className="sidebar-nav">
              {navItems.map((item) => {
                const isActive = activeNav === item.id && screen === 'MAIN';
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setActiveNav(item.id);
                      setScreen('MAIN');
                      setMobileMenuOpen(false);
                    }}
                  >
                    <span className="nav-icon-wrap">{item.icon}</span>
                    <span className="nav-label-text">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="sidebar-bottom">
            <div className="sidebar-target-card">
              <div className="sidebar-target-header">
                <span className="target-lbl">TARGET CAREER</span>
                <span className="target-badge-dot"></span>
              </div>
              <span className="target-role-name">{targetRoleTitle}</span>
              <div className="sidebar-target-bar">
                <div
                  className="sidebar-target-fill"
                  style={{ width: `${realReadiness}%` }}
                />
              </div>
              <span className="sidebar-target-pct">{realReadiness}% Ready</span>
            </div>

            <button
              type="button"
              className="sidebar-sync-btn"
              title="Reload Backend State"
              onClick={() => {
                loadInitialData();
                showToast('Synchronized with backend database.');
              }}
              disabled={loading}
            >
              <IconRefresh />
              <span>{loading ? 'Syncing...' : 'Sync Data'}</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-main-panel">
          {/* Top Bar Navigation */}
          <header className="dashboard-topbar">
            <div className="topbar-left">
              <button
                type="button"
                className="mobile-hamburger-btn"
                onClick={() => setMobileMenuOpen(true)}
                title="Open Navigation Menu"
              >
                <IconMenu />
              </button>

              <div className="topbar-title-group">
                <h1 className="dashboard-heading">{pageInfo.title}</h1>
                <span className="topbar-subhead">{pageInfo.desc}</span>
              </div>
            </div>

            <div className="topbar-right">
              {/* Target Goal Pill */}
              <div className="telemetry-pill pill-role" title="Active Career Target">
                <span className="pill-prefix">GOAL</span>
                <span className="pill-value">{targetRoleTitle}</span>
              </div>

              {/* Readiness Metric */}
              <div className="telemetry-pill pill-readiness" title="Competency Fulfillment">
                <span className="pill-icon"><IconDiamond /></span>
                <span className="pill-value mono">{realReadiness}%</span>
                <span className="pill-sub">Readiness</span>
              </div>

              {/* Verification Coverage */}
              <div className="telemetry-pill pill-coverage" title="Assessment Verified Coverage">
                <span className="pill-icon"><IconCoin /></span>
                <span className="pill-value mono">{realCoverage}%</span>
                <span className="pill-sub">Verified</span>
              </div>

              {/* Student Profile Pill */}
              <div className="topbar-avatar-pill" title={`Logged in as ${studentName}`}>
                <div className="avatar-circle">
                  {studentName.charAt(0).toUpperCase()}
                </div>
                <div className="avatar-info">
                  <span className="avatar-name">{studentName}</span>
                  <span className="avatar-status-text">Active Learner</span>
                </div>
              </div>
            </div>
          </header>

          {/* Quick Stat Cards Grid */}
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
              <div className="bar-track-wrap">
                <div className="bar-fill blue-fill" style={{ width: `${roadmapCompletionPercent}%` }} />
              </div>
            </div>

            {/* Card 2: Career Target */}
            <div className="stat-card card-purple-tint">
              <div className="stat-card-header">
                <span className="stat-card-title">Career Objective</span>
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
              <div className="bar-track-wrap">
                <div className="bar-fill purple-fill" style={{ width: `${realReadiness}%` }} />
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
                <span className="stat-subtext mono">
                  {realGapsCount === 0 ? 'All Requirements Met' : 'Deficits To Close'}
                </span>
              </div>
              <div className="bar-track-wrap">
                <div
                  className="bar-fill pink-fill"
                  style={{
                    width: `${catalog?.skills?.length ? Math.max(10, Math.round(((catalog.skills.length - realGapsCount) / catalog.skills.length) * 100)) : 0}%`
                  }}
                />
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
                profileSummary={appState?.profile_summary}
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
              <AssessmentView
                profileId={appState?.profile?.id}
                onAssessmentComplete={(updatedState) => setAppState(updatedState)}
              />
            )}

            {screen === 'MAIN' && activeNav === 'mentor' && (
              <MentorView
                profileId={appState?.profile?.id}
                state={appState}
              />
            )}

            {screen === 'MAIN' && activeNav === 'agents' && (
              <AgentsView
                profileId={appState?.profile?.id}
                state={appState}
              />
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
