import React from 'react';
import { 
  Home, 
  BookOpen, 
  Layers, 
  BrainCircuit, 
  FileQuestion, 
  History, 
  FolderKanban, 
  Settings, 
  Sparkles 
} from 'lucide-react';
import MascotSvg from '../Mascot/MascotSvg';

/**
 * StudyFetchNavRail.jsx
 * 
 * Deep Burgundy Navigation Sidebar matching Burgundy + Ivory design:
 * - Brand header: "LearnNova"
 * - Rounded pill nav buttons with clean icons & labels
 * - Bottom quote: "Small steps, big progress." with botanical line art
 */
export default function StudyFetchNavRail({
  activeTab,
  setActiveTab,
  onOpenSettings,
  mascotSkin = 'sparky-pup'
}) {
  const navItems = [
    { id: 'plan', label: 'Home', icon: Home, tooltip: 'Home & Study Plan' },
    { id: 'read', label: 'Reading', icon: BookOpen, tooltip: 'Document Reading with Adaptive Nudges' },
    { id: 'studio', label: 'Card Studio', icon: Layers, tooltip: 'Review & Curate Flashcards' },
    { id: 'study', label: 'Study Mode', icon: BrainCircuit, tooltip: 'Spaced Repetition Active Recall (FSRS)' },
    { id: 'history', label: 'Study History', icon: History, tooltip: 'Traceback Past Study Sessions' },
    { id: 'quiz', label: 'Practice Quiz', icon: FileQuestion, tooltip: "Bloom's Diagnostic Quizzes" },
    { id: 'decks', label: 'My Decks', icon: FolderKanban, tooltip: 'Manage Study Sets & Decks' }
  ];

  return (
    <aside className="studyfetch-rail">
      {/* Top Brand Header matching "✦ LearnNova" */}
      <div 
        className="rail-brand-header"
        onClick={() => setActiveTab('plan')}
        title="LearnNova Study Hub"
      >
        <Sparkles size={16} className="rail-brand-sparkle" />
        <span className="rail-brand-title">LearnNova</span>
      </div>

      {/* Navigation Stack */}
      <nav className="rail-nav-stack">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`rail-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={item.tooltip}
            >
              <Icon size={17} />
              <span className="rail-btn-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Quote & Settings */}
      <div className="rail-bottom-box">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Subtle botanical line art */}
          <svg width="22" height="28" viewBox="0 0 24 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
            <path d="M12 30V2" />
            <path d="M12 18C8 16 4 11 4 6C9 6 12 10 12 14" />
            <path d="M12 10C16 8 20 5 20 2C15 2 12 6 12 10" />
            <path d="M12 24C16 22 19 19 19 16C15 16 12 19 12 24" />
          </svg>
          <div className="rail-quote-text">
            Small steps,<br />big progress.
          </div>
        </div>

        <div className="rail-bottom-stack">
          <button 
            className="btn btn-ghost btn-sm" 
            style={{ color: 'var(--rail-muted, #D6B5BF)', padding: '4px 8px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={onOpenSettings}
            title="Settings & Theme Preferences"
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
