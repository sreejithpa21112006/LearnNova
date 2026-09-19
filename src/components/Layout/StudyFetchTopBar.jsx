import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  Clock, 
  Flame, 
  Zap, 
  Upload, 
  Sun, 
  Moon, 
  Share2, 
  Sparkles, 
  MessageSquare, 
  Bot,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { loadGamificationState, subscribeToRewards, getLevelInfo } from '../../services/gamificationService';

export default function StudyFetchTopBar({
  studySetName = "My First Study Set",
  activeTab = "plan",
  isTutorOpen = true,
  onToggleTutor,
  onOpenUpload,
  onOpenSettings
}) {
  const [gameState, setGameState] = useState(loadGamificationState);
  
  // Pomodoro Study Timer State (Default 25 minutes = 1500 seconds)
  const [timerSeconds, setTimerSeconds] = useState(1500);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToRewards(() => {
      setGameState(loadGamificationState());
    });
    return unsubscribe;
  }, []);

  // Timer countdown effect
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds(prev => prev - 1), 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m${s > 0 ? ` ${s < 10 ? '0' : ''}${s}s` : ''}`;
  };

  const getTabLabel = (tab) => {
    switch (tab) {
      case 'plan': return 'Home & Study Plan';
      case 'lecture': return 'Lecture Lab';
      case 'read': return 'Reading & Nudge';
      case 'studio': return 'Card Studio';
      case 'study': return 'Study Mode (FSRS)';
      case 'quiz': return 'QuizFetch Practice';
      case 'history': return 'Study History & Traceback';
      case 'decks': return 'My Decks';
      default: return 'Study Plan';
    }
  };

  const levelInfo = getLevelInfo(gameState.xp);

  return (
    <header className="studyfetch-topbar">
      {/* Left Breadcrumb Trail */}
      <div className="topbar-breadcrumbs">
        <span className="breadcrumb-root">{studySetName}</span>
        <ChevronRight size={14} className="breadcrumb-divider" />
        <span className="breadcrumb-active">{getTabLabel(activeTab)}</span>
      </div>

      {/* Right Controls & Pills */}
      <div className="topbar-actions">
        {/* Streak Flame */}
        <div 
          className="studyfetch-pill streak-pill" 
          title={`${gameState.streakDays} Day Study Streak!`}
        >
          <Flame size={15} className="streak-flame-icon" />
          <span className="pill-bold">{gameState.streakDays}d</span>
        </div>

        {/* XP & Level Badge */}
        <div 
          className="studyfetch-pill xp-pill" 
          title={`Level ${levelInfo.level}: ${levelInfo.title} (${gameState.xp} Total XP)`}
        >
          <Zap size={14} className="xp-zap-icon" />
          <span className="pill-bold">{gameState.xp} XP</span>
        </div>

        {/* 25m Pomodoro Study Timer */}
        <div className="timer-wrapper" style={{ position: 'relative' }}>
          <button 
            className={`studyfetch-pill timer-pill ${isTimerRunning ? 'timer-active' : ''}`}
            onClick={() => setShowTimerMenu(!showTimerMenu)}
            title="Study Session Pomodoro Timer"
          >
            <Clock size={14} />
            <span className="pill-bold">{formatTimer(timerSeconds)}</span>
          </button>

          {showTimerMenu && (
            <div className="timer-dropdown">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Study Timer</span>
                <button 
                  className="btn btn-ghost btn-icon" 
                  style={{ width: '22px', height: '22px' }}
                  onClick={() => { setTimerSeconds(1500); setIsTimerRunning(false); }}
                  title="Reset to 25m"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '4px 8px', fontSize: '0.78rem', justifyContent: 'center' }}
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                >
                  {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
                  <span>{isTimerRunning ? 'Pause' : 'Start'}</span>
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                  onClick={() => { setTimerSeconds(3000); setIsTimerRunning(true); setShowTimerMenu(false); }}
                >
                  50m
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Document Switcher / Upload */}
        <button 
          className="btn btn-secondary topbar-btn"
          onClick={onOpenUpload}
          title="Upload or Switch Document / Notes"
        >
          <Upload size={14} />
          <span>Upload</span>
        </button>

        {/* AI Tutor Panel Toggle (StudyFetch "Chat v" button) */}
        <button 
          className={`studyfetch-pill chat-toggle-pill ${isTutorOpen ? 'active' : ''}`}
          onClick={onToggleTutor}
          title="Toggle AI Tutor Sidebar"
        >
          <Bot size={15} />
          <span>Chat</span>
          <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{isTutorOpen ? '▾' : '▸'}</span>
        </button>
      </div>
    </header>
  );
}
