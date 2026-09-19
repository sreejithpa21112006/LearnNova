import React, { useState } from 'react';
import {
  CheckCircle,
  Clock,
  Sparkles,
  Layers,
  FileText,
  BookOpen,
  HelpCircle,
  BarChart2,
  Zap,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { awardXp } from '../services/gamificationService';

export default function ReadingView({
  documentData,
  chunks = [],
  activeChunkIndex,
  chunkStatus = {},
  dwellTimes = {},
  onSelectChunk,
  onGenerateDeck,
  onTriggerCheckpointManual,
  checkpointsAnswered = new Set(),
  getCheckpointForChunk,
  onCompleteCheckpoint
}) {
  const [openCheckpointIdx, setOpenCheckpointIdx] = useState(null);
  const [inlineData, setInlineData] = useState({});
  const [inlineAnswers, setInlineAnswers] = useState({});
  const totalWords = chunks.reduce((acc, c) => acc + (c.wordCount || 0), 0);
  const totalDwellSpent = Object.values(dwellTimes).reduce((a, b) => a + b, 0);
  const completedChunksCount = Object.values(chunkStatus).filter(s => s === 'completed').length;
  const progressPercent = chunks.length > 0
    ? Math.round((completedChunksCount / chunks.length) * 100)
    : 0;

  // Empty state — no document loaded yet
  if (!documentData) {
    return (
      <div className="document-reader-pane" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', maxWidth: '420px', padding: '40px 20px' }}>
          <div className="brand-icon" style={{ width: '64px', height: '64px', margin: '0 auto 20px' }}>
            <BookOpen size={28} />
          </div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '10px', color: 'var(--text)' }}>
            No Document Loaded
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '24px' }}>
            Upload a PDF or paste your study notes to get started. LearnNova will track your reading and generate flashcards automatically.
          </p>
          <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>
            Click <strong style={{ color: 'var(--accent)' }}>Document</strong> in the top-right to upload.
          </p>
        </div>
      </div>
    );
  }

  const handleToggleInlineCheckpoint = (idx, e) => {
    e.stopPropagation();
    if (openCheckpointIdx === idx) {
      setOpenCheckpointIdx(null);
    } else {
      if (!inlineData[idx] && getCheckpointForChunk) {
        const cp = getCheckpointForChunk(idx);
        if (cp) {
          setInlineData(prev => ({ ...prev, [idx]: cp }));
        }
      }
      setOpenCheckpointIdx(idx);
    }
  };

  const handleAnswerInline = (chunkIdx, optIdx, e) => {
    e.stopPropagation();
    const cp = inlineData[chunkIdx];
    if (!cp || inlineAnswers[chunkIdx]) return;

    const isCorrect = optIdx === cp.correctIndex;
    setInlineAnswers(prev => ({
      ...prev,
      [chunkIdx]: { selectedOption: optIdx, isCorrect }
    }));

    if (isCorrect) {
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch (err) {}
      awardXp('checkpoint_correct', 25, '+25 XP Checkpoint Mastered!');
    } else {
      awardXp('checkpoint_correct', 10, '+10 XP Keep Practicing!');
    }

    if (onCompleteCheckpoint) {
      onCompleteCheckpoint({
        chunkIndex: chunkIdx,
        chunkTitle: cp.chunkTitle || `Section ${chunkIdx + 1}`,
        question: cp.question,
        options: cp.options,
        correctIndex: cp.correctIndex,
        userAnswerIndex: optIdx,
        isCorrect,
        explanation: cp.explanation
      });
    }
  };

  return (
    <div className="document-reader-pane">
      {/* Document Header */}
      <div className="reading-header-bar">
        <div className="doc-meta">
          <span className="doc-category-tag">
            <BookOpen size={12} />
            {documentData?.category || 'Active Document'}
          </span>
          <h1 className="doc-title">{documentData?.title || 'Untitled Document'}</h1>
        </div>

        <div className="reading-stats-chips">
          <div className="stat-chip" title="Total words">
            <FileText size={13} />
            <span><strong>{totalWords}</strong> words</span>
          </div>

          <div className="stat-chip" title="Time spent reading">
            <Clock size={13} />
            <span>
              <strong>
                {Math.floor(totalDwellSpent / 60)}m {totalDwellSpent % 60}s
              </strong>{' '}read
            </span>
          </div>

          <div className="stat-chip" title="Completion">
            <BarChart2 size={13} />
            <span><strong>{progressPercent}%</strong> done</span>
          </div>

          <button
            className="btn btn-primary"
            onClick={onGenerateDeck}
            title="Generate flashcard deck from this document"
          >
            <Sparkles size={14} />
            <span>Generate Deck</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="reading-progress-track">
        <div
          className="reading-progress-fill"
          style={{ width: `${Math.max(2, progressPercent)}%` }}
        />
      </div>

      {/* Section Cards */}
      {chunks.map((chunk, idx) => {
        const isActive = idx === activeChunkIndex;
        const isCompleted = chunkStatus[idx] === 'completed' || checkpointsAnswered.has(idx) || inlineAnswers[idx];
        const dwell = dwellTimes[idx] || 0;
        const targetDwell = chunk.expectedDwellSeconds || 30;
        const miniPercent = Math.min(100, Math.round((dwell / targetDwell) * 100));

        return (
          <article
            key={chunk.id || idx}
            data-chunk-index={idx}
            className={`reading-chunk-card${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`}
            onClick={() => onSelectChunk && onSelectChunk(idx)}
          >
            <div className="chunk-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="chunk-index-badge">
                  Section {idx + 1} of {chunks.length}
                </span>
                {isCompleted && (
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    color: 'var(--green)', fontSize: '0.78rem', fontWeight: 600
                  }}>
                    <CheckCircle size={13} /> Done
                  </span>
                )}
                {isActive && !isCompleted && (
                  <span style={{ color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 600 }}>
                    ● Reading
                  </span>
                )}
              </div>

              <div className="chunk-dwell-indicator">
                <span>{dwell}s / {targetDwell}s</span>
                <div className="dwell-mini-bar">
                  <div
                    className="dwell-mini-fill"
                    style={{
                      width: `${miniPercent}%`,
                      background: miniPercent >= 100 ? 'var(--green)' : 'var(--accent)'
                    }}
                  />
                </div>
              </div>
            </div>

            <h2 className="chunk-title">{chunk.title}</h2>

            <div className="chunk-body">
              {formatChunkMarkdown(chunk.content)}
            </div>

            {/* Section Footer: Key concepts + Inline Micro-Checkpoint Trigger */}
            <div className="chunk-keyterms">
              {chunk.keyTerms && chunk.keyTerms.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                    Concepts:
                  </span>
                  {chunk.keyTerms.map((term, tIdx) => (
                    <span key={tIdx} className="keyterm-pill">#{term}</span>
                  ))}
                </div>
              )}

              {/* Duolingo-style Pull Checkpoint Trigger */}
              <div style={{ marginLeft: 'auto' }}>
                {isCompleted || checkpointsAnswered.has(idx) || inlineAnswers[idx] ? (
                  <span className="inline-checkpoint-completed-tag">
                    <CheckCircle2 size={13} color="var(--green)" />
                    <span>+25 XP Mastered</span>
                  </span>
                ) : (
                  <button
                    className="inline-checkpoint-toggle-btn"
                    onClick={(e) => handleToggleInlineCheckpoint(idx, e)}
                    title="Take an optional 5-second checkpoint for +25 XP"
                  >
                    <Zap size={13} color="#eab308" />
                    <span>Quick Check (+25 XP)</span>
                    {openCheckpointIdx === idx ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                )}
              </div>
            </div>

            {/* Inline Micro-Challenge Card (Zero Modal Interruption!) */}
            {openCheckpointIdx === idx && inlineData[idx] && (
              <div className="inline-checkpoint-container" onClick={(e) => e.stopPropagation()}>
                <div className="inline-checkpoint-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={14} color="#eab308" />
                    <span style={{ fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--accent)' }}>
                      5-Second Micro Challenge
                    </span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>
                    Earn +25 XP
                  </span>
                </div>

                <div className="inline-checkpoint-question">
                  {inlineData[idx].question}
                </div>

                <div className="inline-checkpoint-options">
                  {inlineData[idx].options.map((opt, optIdx) => {
                    const answered = inlineAnswers[idx];
                    let optClass = 'inline-opt-btn';
                    if (answered) {
                      if (optIdx === inlineData[idx].correctIndex) optClass += ' correct';
                      else if (optIdx === answered.selectedOption) optClass += ' wrong';
                    }

                    return (
                      <button
                        key={optIdx}
                        className={optClass}
                        onClick={(e) => handleAnswerInline(idx, optIdx, e)}
                        disabled={!!answered}
                      >
                        <span className="inline-opt-badge">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span style={{ flex: 1 }}>{opt}</span>
                        {answered && optIdx === inlineData[idx].correctIndex && (
                          <CheckCircle2 size={15} color="var(--green)" />
                        )}
                        {answered && optIdx === answered.selectedOption && optIdx !== inlineData[idx].correctIndex && (
                          <XCircle size={15} color="var(--red)" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {inlineAnswers[idx] && (
                  <div className="inline-checkpoint-feedback">
                    <strong style={{ color: inlineAnswers[idx].isCorrect ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', marginBottom: '4px' }}>
                      {inlineAnswers[idx].isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {inlineAnswers[idx].isCorrect ? 'Spot on! (+25 XP earned)' : 'Good effort! (+10 XP)'}
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-2)' }}>
                      {inlineData[idx].explanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}

      {/* End CTA */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        padding: '32px',
        textAlign: 'center',
        marginTop: '8px'
      }}>
        <Sparkles size={28} color="var(--accent)" style={{ margin: '0 auto 10px' }} />
        <h2 style={{ fontSize: '1.1rem', marginBottom: '6px', color: 'var(--text)' }}>
          Finished Reading?
        </h2>
        <p style={{ color: 'var(--text-2)', maxWidth: '480px', margin: '0 auto 18px', fontSize: '0.88rem' }}>
          Convert your checkpoint answers and key concepts into an active recall flashcard deck.
        </p>
        <button
          className="btn btn-primary"
          onClick={onGenerateDeck}
        >
          <Layers size={16} />
          <span>Generate Flashcard Deck</span>
        </button>
      </div>
    </div>
  );
}

function formatChunkMarkdown(text) {
  if (!text) return null;
  const paragraphs = text.split(/\n\s*\n/);

  return paragraphs.map((para, pIdx) => {
    if (para.trim().startsWith('- ') || para.trim().startsWith('* ')) {
      const items = para.split(/\n/).map(l => l.replace(/^[-*]\s+/, '').trim()).filter(Boolean);
      return (
        <ul key={pIdx} style={{ paddingLeft: '18px', marginBottom: '10px' }}>
          {items.map((item, iIdx) => (
            <li key={iIdx} style={{ marginBottom: '4px' }}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    }
    if (/^\d+\.\s+/.test(para.trim())) {
      const items = para.split(/\n/).map(l => l.replace(/^\d+\.\s+/, '').trim()).filter(Boolean);
      return (
        <ol key={pIdx} style={{ paddingLeft: '18px', marginBottom: '10px' }}>
          {items.map((item, iIdx) => (
            <li key={iIdx} style={{ marginBottom: '4px' }}>{renderInline(item)}</li>
          ))}
        </ol>
      );
    }
    return <p key={pIdx}>{renderInline(para)}</p>;
  });
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} style={{ color: 'var(--text)', fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={idx} style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          padding: '1px 5px',
          borderRadius: '4px',
          fontFamily: 'var(--mono)',
          fontSize: '0.85em',
          color: 'var(--accent)'
        }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
