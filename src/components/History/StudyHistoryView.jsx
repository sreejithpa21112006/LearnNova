import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  Brain, 
  FileQuestion, 
  BookOpen, 
  Radio, 
  Sparkles, 
  Search, 
  Trash2, 
  Download, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Award, 
  Clock, 
  ExternalLink,
  Target,
  Layers,
  Zap,
  Bot
} from 'lucide-react';
import { 
  getStudyHistory, 
  clearStudyHistory, 
  deleteStudyActivity, 
  subscribeToHistory 
} from '../../services/storageService';

/**
 * StudyHistoryView.jsx
 * 
 * Study History & Traceback Component:
 * Allows users to inspect their entire learning journey across:
 * - Flashcard reviews (typed answers, AI semantic match scores, FSRS grades)
 * - Nova Copilot challenges (diagnostic checks, answers, explanations)
 * - Practice exams & quizzes (accuracy, score, question breakdowns)
 * - Document reading & attention checkpoints (dwell time, reading pace)
 * 
 * Includes interactive "Traceback / Jump Back" actions to return directly to that material.
 */
export default function StudyHistoryView({
  onJumpToDeck,
  onJumpToReadingSection,
  onJumpToQuiz,
  onJumpToStudio
}) {
  const [history, setHistory] = useState(getStudyHistory);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'flashcard' | 'copilot_challenge' | 'quiz' | 'reading'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState({});

  // Subscribe to storage updates
  useEffect(() => {
    const unsub = subscribeToHistory((updated) => {
      setHistory(updated);
    });
    return unsub;
  }, []);

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleDelete = (id, e) => {
    e?.stopPropagation();
    const updated = deleteStudyActivity(id);
    setHistory(updated);
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear your study history? This action cannot be undone.")) {
      clearStudyHistory();
      setHistory([]);
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `learnnova-study-history-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filter & Search
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      // Category match
      if (activeFilter !== 'all' && item.type !== activeFilter) {
        return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const subMatch = (item.subtitle || '').toLowerCase().includes(q);
        const questionMatch = (item.question || '').toLowerCase().includes(q);
        const userAnsMatch = (item.userAnswer || '').toLowerCase().includes(q);
        const targetAnsMatch = (item.targetAnswer || '').toLowerCase().includes(q);
        return titleMatch || subMatch || questionMatch || userAnsMatch || targetAnsMatch;
      }

      return true;
    });
  }, [history, activeFilter, searchQuery]);

  // Analytics Metrics
  const stats = useMemo(() => {
    const total = history.length;
    const flashcards = history.filter(h => h.type === 'flashcard');
    const challenges = history.filter(h => h.type === 'copilot_challenge');
    const quizzes = history.filter(h => h.type === 'quiz');

    // Average AI closeness score for flashcards
    const scores = flashcards.filter(f => typeof f.aiScore === 'number').map(f => f.aiScore);
    const avgAiScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    // Total XP logged
    const totalXp = history.reduce((acc, curr) => acc + (curr.xpEarned || 0), 0);

    return {
      total,
      cardsRecalled: flashcards.length,
      challengesSolved: challenges.length,
      quizzesTaken: quizzes.length,
      avgAiScore,
      totalXp
    };
  }, [history]);

  const formatTimeAgo = (isoString) => {
    if (!isoString) return 'Recently';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    const days = Math.floor(diffSec / 86400);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="history-view-container">
      {/* Top Header Ribbon */}
      <div className="history-header-ribbon">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div className="brand-icon" style={{ width: '32px', height: '32px' }}>
              <History size={18} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Study History & Traceback</h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-2)' }}>
            Trace back every flashcard recalled, copilot challenge solved, quiz taken, and section read.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={handleExportJSON}
            title="Download Study Logs as JSON"
          >
            <Download size={14} /> Export Logs
          </button>
          {history.length > 0 && (
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={handleClearAll}
              style={{ color: 'var(--text-3)' }}
              title="Clear all recorded history"
            >
              <Trash2 size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Analytics Summary Bar */}
      <div className="history-stats-grid">
        <div className="history-stat-box">
          <div className="history-stat-icon-wrapper" style={{ background: 'rgba(127, 29, 58, 0.08)', color: 'var(--accent)' }}>
            <Brain size={20} />
          </div>
          <div>
            <div className="history-stat-val">{stats.cardsRecalled}</div>
            <div className="history-stat-lbl">Cards Recalled</div>
          </div>
        </div>

        <div className="history-stat-box">
          <div className="history-stat-icon-wrapper" style={{ background: 'rgba(127, 29, 58, 0.08)', color: 'var(--accent)' }}>
            <Target size={20} />
          </div>
          <div>
            <div className="history-stat-val">{stats.avgAiScore !== null ? `${stats.avgAiScore}%` : 'N/A'}</div>
            <div className="history-stat-lbl">Avg AI Recall Match</div>
          </div>
        </div>

        <div className="history-stat-box">
          <div className="history-stat-icon-wrapper" style={{ background: 'rgba(127, 29, 58, 0.08)', color: 'var(--accent)' }}>
            <FileQuestion size={20} />
          </div>
          <div>
            <div className="history-stat-val">{stats.challengesSolved + stats.quizzesTaken}</div>
            <div className="history-stat-lbl">Quizzes & Drills</div>
          </div>
        </div>

        <div className="history-stat-box">
          <div className="history-stat-icon-wrapper" style={{ background: 'rgba(127, 29, 58, 0.08)', color: 'var(--accent)' }}>
            <Award size={20} />
          </div>
          <div>
            <div className="history-stat-val" style={{ color: 'var(--accent)' }}>+{stats.totalXp}</div>
            <div className="history-stat-lbl">Total XP Earned</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="history-toolbar">
        {/* Search */}
        <div className="history-search-box">
          <Search size={15} color="var(--text-3)" />
          <input 
            type="text" 
            placeholder="Search by topic, question, or typed answer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="btn btn-ghost btn-icon" 
              style={{ width: '20px', height: '20px' }}
              onClick={() => setSearchQuery('')}
            >
              <RotateCcw size={12} />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="history-chips-row">
          {[
            { id: 'all', label: 'All Activities', icon: History },
            { id: 'flashcard', label: 'Flashcards', icon: Brain },
            { id: 'copilot_challenge', label: 'Copilot Drills', icon: Target },
            { id: 'quiz', label: 'Quizzes & Exams', icon: FileQuestion },
            { id: 'reading', label: 'Reading & Checkpoints', icon: BookOpen }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                className={`history-filter-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveFilter(tab.id)}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline Stream */}
      {filteredHistory.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--r-xl)', border: '1px dashed var(--border)' }}>
          <History size={36} color="var(--text-3)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px 0' }}>No activities found</h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-3)', margin: 0 }}>
            {searchQuery ? "Try refining your search terms or filter." : "Start reading or quizzing to build your learning history!"}
          </p>
        </div>
      ) : (
        <div className="history-timeline-stream">
          {filteredHistory.map(item => {
            const isExpanded = !!expandedItems[item.id];

            return (
              <div key={item.id} className="history-item-card">
                {/* Item Card Top */}
                <div className="history-item-top">
                  <div style={{ flex: 1 }}>
                    {/* Meta bar */}
                    <div className="history-item-meta">
                      <span className={`history-type-badge ${item.type}`}>
                        {item.type === 'flashcard' && <><Layers size={11} color="var(--accent)" /> <span>Flashcard</span></>}
                        {item.type === 'copilot_challenge' && <><Bot size={11} color="var(--accent)" /> <span>Copilot Drill</span></>}
                        {item.type === 'quiz' && <><FileQuestion size={11} color="var(--accent)" /> <span>Quiz</span></>}
                        {item.type === 'reading' && <><BookOpen size={11} color="var(--accent)" /> <span>Reading</span></>}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} /> {formatTimeAgo(item.timestamp)}
                      </span>
                      {item.xpEarned && (
                        <>
                          <span>•</span>
                          <span style={{ color: 'var(--accent)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Award size={12} color="var(--accent)" /> +{item.xpEarned} XP
                          </span>
                        </>
                      )}
                    </div>

                    {/* Main Title & Subtitle */}
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
                      {item.title}
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>
                      {item.subtitle}
                    </div>

                    {/* Quick Stats Tags */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {/* Flashcard Stats */}
                      {item.type === 'flashcard' && (
                        <>
                          {typeof item.aiScore === 'number' && (
                            <span className="studyfetch-pill" style={{ fontSize: '0.72rem', background: 'rgba(127, 29, 58, 0.06)', border: '1px solid rgba(127, 29, 58, 0.16)', color: 'var(--accent)' }}>
                              <Sparkles size={11} color="var(--accent)" /> AI Match: {item.aiScore}%
                            </span>
                          )}
                          {item.gradeLabel && (
                            <span className="studyfetch-pill" style={{ fontSize: '0.72rem', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                              Grade: {item.gradeLabel}
                            </span>
                          )}
                          {item.algorithm && (
                            <span className="studyfetch-pill" style={{ fontSize: '0.72rem', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
                              Alg: {item.algorithm.toUpperCase()}
                            </span>
                          )}
                        </>
                      )}

                      {/* Copilot Challenge Stats */}
                      {item.type === 'copilot_challenge' && (
                        <span className="studyfetch-pill" style={{ fontSize: '0.72rem', color: 'var(--accent)', background: 'rgba(127, 29, 58, 0.06)', border: '1px solid rgba(127, 29, 58, 0.16)' }}>
                          {item.isCorrect ? <CheckCircle2 size={12} color="var(--accent)" /> : <XCircle size={12} color="var(--accent)" />}
                          <span>{item.isCorrect ? 'Correct Recall' : 'Concept Reviewed'}</span>
                        </span>
                      )}

                      {/* Quiz Stats */}
                      {item.type === 'quiz' && (
                        <span className="studyfetch-pill" style={{ fontSize: '0.72rem', color: 'var(--accent)', background: 'rgba(127, 29, 58, 0.06)', border: '1px solid rgba(127, 29, 58, 0.16)' }}>
                          Score: {item.score}/{item.totalQuestions} ({item.accuracy}%)
                        </span>
                      )}

                      {/* Reading Stats */}
                      {item.type === 'reading' && (
                        <>
                          {item.dwellSeconds && (
                            <span className="studyfetch-pill" style={{ fontSize: '0.72rem', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                              Dwell: {Math.floor(item.dwellSeconds / 60)}m {item.dwellSeconds % 60}s
                            </span>
                          )}
                          {item.wpm && (
                            <span className="studyfetch-pill" style={{ fontSize: '0.72rem', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                              Pace: {item.wpm} WPM
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => toggleExpand(item.id)}
                      style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                    >
                      {isExpanded ? 'Hide Traceback' : 'Traceback'}
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    <button 
                      className="btn btn-ghost btn-icon"
                      style={{ width: '24px', height: '24px', color: 'var(--text-3)' }}
                      onClick={(e) => handleDelete(item.id, e)}
                      title="Delete entry from history"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Traceback Expanded Drawer */}
                {isExpanded && (
                  <div className="history-traceback-drawer">
                    {/* 1. Flashcard Traceback: Typed Answer vs Target Answer */}
                    {item.type === 'flashcard' && (
                      <>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)' }}>
                          Q: {item.question}
                        </div>

                        <div className="traceback-comparison-grid">
                          <div className="traceback-block">
                            <div className="traceback-block-title">Your Typed Response</div>
                            <div className="traceback-block-content" style={{ fontStyle: item.userAnswer ? 'normal' : 'italic' }}>
                              {item.userAnswer || "(Card flipped directly without typing)"}
                            </div>
                          </div>

                          <div className="traceback-block">
                            <div className="traceback-block-title">Reference Target Answer</div>
                            <div className="traceback-block-content">
                              {item.targetAnswer}
                            </div>
                          </div>
                        </div>

                        {item.aiFeedback && (
                          <div className="traceback-ai-verdict-box">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent)' }}>
                                <Sparkles size={12} /> AI Semantic Evaluation
                              </span>
                              <span style={{ fontSize: '0.74rem', fontWeight: 800 }}>
                                {item.aiVerdict} ({item.aiScore}%)
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.45 }}>
                              {item.aiFeedback}
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => onJumpToDeck?.(item.deckId)}
                          >
                            <Brain size={13} /> Study Deck Again
                          </button>
                        </div>
                      </>
                    )}

                    {/* 2. Copilot Challenge & Reading Checkpoint Traceback */}
                    {(item.type === 'copilot_challenge' || item.type === 'reading') && (
                      <>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)' }}>
                          Question: {item.question || item.checkpointQuestion}
                        </div>

                        <div className="traceback-comparison-grid">
                          <div className="traceback-block">
                            <div className="traceback-block-title">Your Selected Option</div>
                            <div className="traceback-block-content" style={{ color: item.isCorrect ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                              {item.selectedOption || "Answered"}
                            </div>
                          </div>

                          <div className="traceback-block">
                            <div className="traceback-block-title">Correct Reference Concept</div>
                            <div className="traceback-block-content" style={{ color: '#10b981', fontWeight: 600 }}>
                              {item.correctOption || item.selectedOption}
                            </div>
                          </div>
                        </div>

                        {item.explanation && (
                          <div className="traceback-block" style={{ background: 'var(--surface-2)' }}>
                            <div className="traceback-block-title">Explanation</div>
                            <div className="traceback-block-content">
                              {item.explanation}
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => onJumpToReadingSection?.(item.chunkIndex ?? 0)}
                          >
                            <BookOpen size={13} /> Resume Section Reading
                          </button>
                        </div>
                      </>
                    )}

                    {/* 3. Quiz Traceback */}
                    {item.type === 'quiz' && (
                      <>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)' }}>
                          Diagnostic Breakdown ({item.score} of {item.totalQuestions} correct)
                        </div>

                        {item.questions && item.questions.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {item.questions.map((q, qIdx) => (
                              <div key={qIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', padding: '6px 10px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)' }}>
                                {q.isCorrect ? <CheckCircle2 size={14} color="#10b981" /> : <XCircle size={14} color="#ef4444" />}
                                <span style={{ flex: 1 }}>{q.question}</span>
                                <span style={{ fontWeight: 700, color: q.isCorrect ? '#10b981' : '#ef4444' }}>
                                  {q.isCorrect ? 'Correct' : 'Missed'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => onJumpToQuiz?.()}
                          >
                            <FileQuestion size={13} /> Retake Practice Exam
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
