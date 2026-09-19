import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  Layers, 
  Brain, 
  FolderHeart, 
  Upload, 
  Settings, 
  Sparkles, 
  Bot, 
  Sun, 
  Moon,
  Flame,
  Zap
} from 'lucide-react';
import { loadGamificationState, subscribeToRewards, getLevelInfo } from '../services/gamificationService';

export default function Navbar({
  activeTab,
  setActiveTab,
  isAvatarEnabled,
  toggleAvatar,
  sensitivity,
  onOpenUpload,
  onOpenSettings,
  theme,
  toggleTheme,
  dueCardsCount = 0
}) {
  const [gameState, setGameState] = useState(loadGamificationState);

  useEffect(() => {
    const unsubscribe = subscribeToRewards(() => {
      setGameState(loadGamificationState());
    });
    return unsubscribe;
  }, []);

  const levelInfo = getLevelInfo(gameState.xp);
  return (
    <header className="navbar-wrapper">
      <nav className="navbar-capsule">
        {/* Brand & Logo */}
        <div className="nav-brand" onClick={() => setActiveTab('read')}>
          <div className="brand-icon">
            <GraduationCap size={20} />
          </div>
          <div>
            <span style={{ fontWeight: 800 }}>Learn</span>
            <span style={{ color: 'var(--accent)', fontWeight: 800 }}>Nova</span>
          </div>
        </div>

        {/* Center Mode Switcher Tabs */}
        <div className="nav-links">
          <button 
            className={`nav-tab ${activeTab === 'read' ? 'active' : ''}`}
            onClick={() => setActiveTab('read')}
            title="Read documents with real-time adaptive avatar nudges"
          >
            <BookOpen size={16} />
            <span>Read & Nudge</span>
          </button>

          <button 
            className={`nav-tab ${activeTab === 'studio' ? 'active' : ''}`}
            onClick={() => setActiveTab('studio')}
            title="Review and curate generated flashcards"
          >
            <Layers size={16} />
            <span>Card Studio</span>
          </button>

          <button 
            className={`nav-tab ${activeTab === 'study' ? 'active' : ''}`}
            onClick={() => setActiveTab('study')}
            title="SuperMemo SM-2 Spaced Repetition Active Recall"
          >
            <Brain size={16} />
            <span>Study Mode</span>
            {dueCardsCount > 0 && (
              <span style={{
                background: 'var(--red)',
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '9999px',
                lineHeight: 1
              }}>
                {dueCardsCount}
              </span>
            )}
          </button>

          <button 
            className={`nav-tab ${activeTab === 'decks' ? 'active' : ''}`}
            onClick={() => setActiveTab('decks')}
            title="Manage saved decks and export to Anki"
          >
            <FolderHeart size={16} />
            <span>My Decks</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="nav-actions">
          {/* Duolingo Streak Badge */}
          <div 
            className="nav-gamify-pill streak-pill" 
            title={`${gameState.streakDays} Day Study Streak! Study daily to keep the flame alive.`}
          >
            <Flame size={15} className="streak-icon-active" />
            <span className="pill-text">{gameState.streakDays}d</span>
          </div>

          {/* XP & Level Badge */}
          <div 
            className="nav-gamify-pill xp-pill" 
            title={`Level ${levelInfo.level}: ${levelInfo.title} (${gameState.xp} Total XP, ${levelInfo.xpToNext} XP to Lvl ${levelInfo.level + 1})`}
          >
            <Zap size={14} className="xp-icon-active" />
            <span className="pill-text">{gameState.xp} XP</span>
            <span className="pill-lvl-tag">Lvl {levelInfo.level}</span>
          </div>

          {/* Instant Avatar Toggle (FR10: visible, always available, zero confirmation dialog) */}
          <button 
            className={`avatar-toggle-btn ${isAvatarEnabled ? 'enabled' : ''}`}
            onClick={toggleAvatar}
            title={isAvatarEnabled ? "Avatar is actively monitoring. Click to toggle OFF" : "Avatar is off. Click to toggle ON"}
          >
            <Bot size={16} />
            <span>Copilot {isAvatarEnabled ? 'ON' : 'OFF'}</span>
            <span className="avatar-toggle-dot" />
          </button>

          {/* Upload / Switch Document */}
          <button 
            className="btn btn-secondary" 
            onClick={onOpenUpload}
            title="Upload PDF or choose high-yield CSE notes"
            style={{ padding: '6px 14px', fontSize: '0.84rem' }}
          >
            <Upload size={15} />
            <span>Document</span>
          </button>

          {/* Theme Toggle */}
          <button 
            className="btn btn-ghost btn-icon" 
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Settings Modal */}
          <button 
            className="btn btn-ghost btn-icon" 
            onClick={onOpenSettings}
            title="Sensitivity & Reading Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </nav>
    </header>
  );
}
