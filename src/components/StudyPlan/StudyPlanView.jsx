import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Send, 
  Sparkles, 
  SlidersHorizontal, 
  Settings, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  ArrowRight, 
  Plus, 
  BookOpen, 
  Calendar, 
  GraduationCap,
  Play,
  X,
  Flame,
  Award,
  Layers
} from 'lucide-react';

/**
 * StudyPlanView.jsx
 * 
 * Elegant Study Plan dashboard matching Burgundy + Ivory design:
 * - "Good morning, Keep going, you're doing great!" greeting banner
 * - Quick Actions Grid: Reading, Flashcards, Lecture Lab
 * - Today's Progress row with reading progress, flashcards studied, streak, quote
 * - Topic Timeline Tree with interactive checkpoints
 */
export default function StudyPlanView({
  currentDoc,
  chunks = [],
  onStartReadingTopic,
  onStartDiagnosticQuiz,
  onStartFlashcards,
  onStartLectureLab,
  onOpenUpload
}) {
  const [expandedTopic, setExpandedTopic] = useState(0);
  const [isGuidedTooltipVisible, setIsGuidedTooltipVisible] = useState(true);
  const [tooltipStep, setTooltipStep] = useState(1);
  const [selectedMode, setSelectedMode] = useState('Comprehensive');
  const [completedTopics, setCompletedTopics] = useState(new Set([0])); // Topic 1 covered

  // Topics derived from document chunks or high-yield defaults
  const topics = chunks.length > 0
    ? chunks.map((c, i) => ({
        id: i,
        title: c.title || `Module ${i + 1}`,
        source: currentDoc?.title ? `${currentDoc.title}.pdf` : 'WEEK 01.pdf',
        readTime: `${c.estimatedMinutes || 3} min`,
        summary: c.content?.slice(0, 120) || 'Foundational conceptual introduction.'
      }))
    : [
        {
          id: 0,
          title: "Introduction to Machine Learning Fundamentals",
          source: "WEEK 01.pdf",
          readTime: "3 min",
          summary: "Core learning definitions (Mitchell's triad T, P, E) and inductive bias foundations."
        },
        {
          id: 1,
          title: "Components and Applications of Learning Problems",
          source: "WEEK 01.pdf",
          readTime: "5 min",
          summary: "Loss functions, empirical risk minimization, and hypothesis class boundaries."
        },
        {
          id: 2,
          title: "Foundations of Machine Learning and Inductive Learning",
          source: "WEEK 02.pdf",
          readTime: "6 min",
          summary: "Occam's razor, generalization bounds, and model regularizations."
        },
        {
          id: 3,
          title: "Supervised Classification vs Regression Architectures",
          source: "WEEK 02.pdf",
          readTime: "4 min",
          summary: "Decision boundaries, support vector principles, and cross-entropy optimization."
        }
      ];

  const coveredCount = completedTopics.size;
  const masteredCount = 0;
  const totalCount = topics.length;
  const progressPercent = Math.round((coveredCount / totalCount) * 100);

  return (
    <div className="studyfetch-plan-container">
      {/* 1. Dashboard Greeting Banner matching user screenshot */}
      <div className="dashboard-greeting-banner">
        <div>
          <h2 className="dashboard-greeting-title">Good morning,</h2>
          <p className="dashboard-greeting-sub">Keep going, you're doing great!</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Books line art */}
          <svg width="48" height="42" viewBox="0 0 64 48" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
            <path d="M4 38L20 44L60 30L44 24L4 38Z" />
            <path d="M4 30L20 36L60 22L44 16L4 30Z" />
            <path d="M4 22L20 28L60 14L44 8L4 22Z" />
            <path d="M4 22V38" />
            <path d="M20 28V44" />
            <path d="M60 14V30" />
            <path d="M50 8C54 4 58 6 62 2" />
          </svg>
        </div>
      </div>

      {/* 2. Quick Action Cards (Reading, Flashcards, Lecture Lab) matching screenshot */}
      <div className="dashboard-quick-grid">
        {/* Card 1: Reading */}
        <div className="dashboard-quick-card">
          <div className="quick-card-icon-circle">
            <BookOpen size={20} />
          </div>
          <div className="quick-card-title">Reading</div>
          <div className="quick-card-desc">
            Turn your reading into active learning.
          </div>
          <button 
            className="quick-card-btn"
            onClick={() => onStartReadingTopic?.(0)}
          >
            <span>Start Reading</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Card 2: Flashcards */}
        <div className="dashboard-quick-card">
          <div className="quick-card-icon-circle">
            <Layers size={20} />
          </div>
          <div className="quick-card-title">Flashcards</div>
          <div className="quick-card-desc">
            Practice with AI-powered flashcards.
          </div>
          <button 
            className="quick-card-btn"
            onClick={() => onStartFlashcards?.()}
          >
            <span>Go to Flashcards</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Card 3: Lecture Lab */}
        <div className="dashboard-quick-card">
          <div className="quick-card-icon-circle">
            <Play size={20} />
          </div>
          <div className="quick-card-title">Lecture Lab</div>
          <div className="quick-card-desc">
            Paste a YouTube link and get summaries + questions.
          </div>
          <button 
            className="quick-card-btn"
            onClick={() => onStartLectureLab?.()}
          >
            <span>Open Lecture Lab</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 3. Today's Progress Row */}
      <div className="dashboard-today-progress-row">
        <div className="today-progress-card">
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.04em' }}>
            Today's Progress
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '16px', flexWrap: 'wrap' }}>
            {/* Progress metric */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '3.5px solid var(--surface-2)', borderTopColor: 'var(--accent)', fontWeight: 800, fontSize: '0.78rem', color: 'var(--accent)' }}>
                {progressPercent || 65}%
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Reading Progress</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{coveredCount} / {totalCount} chapters</div>
              </div>
            </div>

            {/* Flashcards studied */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                <Layers size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>12 Flashcards</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Studied Today</div>
              </div>
            </div>

            {/* Streak */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
                <Flame size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>5 Day Streak</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Keep going strong</div>
              </div>
            </div>
          </div>
        </div>

        {/* Motivational quote card */}
        <div className="today-quote-card">
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: '0.92rem', color: 'var(--accent)', fontWeight: 600, lineHeight: 1.4 }}>
              "Better learning, brighter future."
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '4px' }}>
              Study today, shine tomorrow.
            </div>
          </div>
          <svg width="24" height="32" viewBox="0 0 24 32" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
            <path d="M12 30V2" />
            <path d="M12 18C8 16 4 11 4 6C9 6 12 10 12 14" />
            <path d="M12 10C16 8 20 5 20 2C15 2 12 6 12 10" />
          </svg>
        </div>
      </div>

      {/* Set Header Bar */}
      <div className="set-header-bar">
        <div className="set-icon-box">
          <GraduationCap size={28} color="#6366f1" />
        </div>
        <div className="set-meta">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="set-title">{currentDoc?.title || "My First Study Set"}</h1>
            <button className="btn btn-ghost btn-icon" style={{ width: '24px', height: '24px' }}>
              <Settings size={14} />
            </button>
          </div>
          <div className="set-badges-row">
            <span className="set-badge"><BookOpen size={12} /> {totalCount} Topics</span>
            <span className="set-badge covered"><CheckCircle2 size={12} /> {coveredCount} Covered</span>
            <span className="set-badge mastered"><Award size={12} /> {masteredCount} Mastered</span>
            <div className="set-progress-track">
              <div className="set-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout Grid: Timeline Canvas + Side Cards */}
      <div className="studyfetch-grid">
        {/* Left Column: Interactive Study Plan Timeline Modal/Card */}
        <div className="study-plan-card">
          {/* Top Customization Toolbar */}
          <div className="plan-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="toolbar-label">Customize your Study Plan</span>
              <div className="plan-pill-select">
                <span>Mode</span>
                <button className="mode-toggle-btn">
                  <span>{selectedMode}</span>
                </button>
              </div>
              <div className="plan-pill-select">
                <span>Sort By</span>
                <button className="mode-toggle-btn recommended">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={12} color="var(--accent)" /> Recommended
                  </span>
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button className="btn btn-ghost btn-icon" title="Filter topics">
                <SlidersHorizontal size={15} />
              </button>
              <button className="btn btn-ghost btn-icon" title="Plan settings">
                <Settings size={15} />
              </button>
            </div>
          </div>

          {/* Timeline Content */}
          <div className="plan-timeline-body">
            {/* Start Learning Marker */}
            <div className="timeline-start-node">
              <div className="start-icon-bubble" style={{ background: 'rgba(127, 29, 58, 0.1)' }}>
                <Send size={14} color="var(--accent)" style={{ transform: 'rotate(-45deg)' }} />
              </div>
              <span className="start-node-text">Start learning here</span>
            </div>

            {/* Topics Tree */}
            <div className="timeline-tree">
              {topics.map((topic, index) => {
                const isExpanded = expandedTopic === index;
                const isCovered = completedTopics.has(index);

                return (
                  <div key={topic.id} className="timeline-item">
                    {/* Vertical Connecting Line */}
                    <div className="timeline-spine">
                      <div className={`timeline-dot ${isCovered ? 'covered' : ''}`} />
                    </div>

                    {/* Topic Row Card */}
                    <div className="timeline-topic-container">
                      <div 
                        className={`topic-row-header ${isExpanded ? 'active' : ''}`}
                        onClick={() => setExpandedTopic(isExpanded ? null : index)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <span className="topic-header-title">{topic.title}</span>
                        </div>
                      </div>

                      {/* Expanded Sub-Tasks */}
                      {isExpanded && (
                        <div className="topic-subtasks-card">
                          {/* "See what you already know" Diagnostic Checkpoint */}
                          <div className="diagnostic-subcard">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div className="diagnostic-clock-icon" style={{ background: 'rgba(127, 29, 58, 0.08)' }}>
                                <Clock size={16} color="var(--accent)" />
                              </div>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>
                                  See what you already know
                                </h4>
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>
                                  Takes {topic.readTime}
                                </span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button 
                                className="btn btn-dark-pill"
                                onClick={() => onStartDiagnosticQuiz?.(index)}
                              >
                                Save Time
                              </button>
                              <button 
                                className="btn btn-ghost-pill"
                                onClick={() => {
                                  setCompletedTopics(prev => new Set([...prev, index]));
                                  setExpandedTopic(index + 1 < topics.length ? index + 1 : index);
                                }}
                              >
                                ⏭ Skip
                              </button>
                            </div>
                          </div>

                          {/* Primary Reading / Module Item */}
                          <div 
                            className="module-item-row"
                            onClick={() => onStartReadingTopic?.(index)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div className="module-circle-dot" />
                              <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>{topic.title}</span>
                            </div>
                            <div className="source-tag">
                              <FileText size={11} />
                              <span>Sources: {topic.source}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Guided Walkthrough Tooltip ("1 of 3 [Next]") matching screenshot */}
          {isGuidedTooltipVisible && (
            <div className="guided-onboarding-tooltip">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800 }}>This is your study plan</h4>
                <button 
                  className="btn btn-ghost btn-icon" 
                  style={{ width: '20px', height: '20px', padding: 0 }}
                  onClick={() => setIsGuidedTooltipVisible(false)}
                >
                  <X size={13} />
                </button>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', margin: '6px 0 10px 0', lineHeight: 1.45 }}>
                Every topic from your materials, ordered to actually stick. Foundations first, harder stuff once you're ready.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-3)', fontWeight: 600 }}>
                  {tooltipStep} of 3
                </span>
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '4px 12px', fontSize: '0.76rem', borderRadius: '9999px' }}
                  onClick={() => {
                    if (tooltipStep < 3) setTooltipStep(tooltipStep + 1);
                    else setIsGuidedTooltipVisible(false);
                  }}
                >
                  {tooltipStep < 3 ? 'Next' : 'Got it!'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Column: Background Dashboard Cards */}
        <div className="studyfetch-sidecards">
          {/* Your Progress Card */}
          <div className="dashboard-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Your Progress</span>
              <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{progressPercent}%</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="sidecard-stats-list">
              <div className="stat-line"><BookOpen size={14} /> <span>{totalCount} Topics</span></div>
              <div className="stat-line"><CheckCircle2 size={14} color="#10b981" /> <span>{coveredCount} Covered</span></div>
              <div className="stat-line"><Award size={14} color="#f59e0b" /> <span>{masteredCount} Mastered</span></div>
            </div>
          </div>

          {/* Add Syllabus Card */}
          <div className="dashboard-card">
            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.88rem' }}>Add your syllabus ℹ️</h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: 'var(--text-2)' }}>
              Tailor your study plan to your class schedule and priorities.
            </p>
            <button className="btn btn-secondary full-width" onClick={onOpenUpload}>
              <Plus size={14} /> Add Syllabus
            </button>
          </div>

          {/* Exam Dates Card */}
          <div className="dashboard-card">
            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.88rem' }}>Exam Dates</h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: 'var(--text-2)' }}>
              Ensure you are studying what you need to before your exams.
            </p>
            <button className="btn btn-secondary full-width">
              <Plus size={14} /> Add Exam
            </button>
          </div>

          {/* Guided Session Card */}
          <div className="dashboard-card highlight-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span className="badge-new">NEW</span>
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Start a Guided Session</span>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.76rem', color: 'var(--text-2)' }}>
              Sparky will navigate you across StudyFetch while you learn.
            </p>
            <button className="btn btn-primary full-width" onClick={() => onStartReadingTopic?.(0)}>
              <span>Launch Session</span> <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
