import React from 'react';
import {
  CheckCircle,
  Clock,
  Sparkles,
  Layers,
  FileText,
  BookOpen,
  HelpCircle,
  BarChart2
} from 'lucide-react';

export default function ReadingView({
  documentData,
  chunks = [],
  activeChunkIndex,
  chunkStatus = {},
  dwellTimes = {},
  onSelectChunk,
  onGenerateDeck,
  onTriggerCheckpointManual,
  checkpointsAnswered = new Set()
}) {
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
        const isCompleted = chunkStatus[idx] === 'completed' || checkpointsAnswered.has(idx);
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

            {chunk.keyTerms && chunk.keyTerms.length > 0 && (
              <div className="chunk-keyterms">
                <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                  Key Concepts:
                </span>
                {chunk.keyTerms.map((term, tIdx) => (
                  <span key={tIdx} className="keyterm-pill">#{term}</span>
                ))}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTriggerCheckpointManual(idx);
                  }}
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <HelpCircle size={13} /> Checkpoint
                </button>
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
