import React, { useState } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  ArrowRight,
  Copy,
  Check,
  Zap
} from 'lucide-react';

/**
 * LectureNotesViewer.jsx
 * 
 * Cornell-Style Structured Lecture Notes:
 * - Executive summary of key lecture principles
 * - Key Takeaways bullet chips
 * - Collapsible chapter outline
 * - Direct "Open in Reading View" bridge
 */
export default function LectureNotesViewer({
  notes,
  title,
  onOpenInReadingView
}) {
  const [copied, setCopied] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});

  const toggleSection = (idx) => {
    setCollapsedSections(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopy = () => {
    const fullText = `# ${title}\n\n## Summary\n${notes.summary}\n\n## Key Takeaways\n${notes.keyTakeaways.join('\n')}\n\n## Detailed Outline\n${notes.outline.map(o => `### ${o.heading}\n${o.content}`).join('\n\n')}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="lecture-notes-wrapper">
      {/* Top Actions */}
      <div className="notes-action-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={18} color="var(--accent)" />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
            Structured Cornell Lecture Notes
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
            {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
          </button>
          {onOpenInReadingView && (
            <button className="btn btn-primary btn-sm" onClick={onOpenInReadingView}>
              <span>Study in Reading View</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Summary Box */}
      <div className="notes-summary-card">
        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.86rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Executive Summary
        </h4>
        <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--text)' }}>
          {notes.summary}
        </p>
      </div>

      {/* Key Takeaways */}
      <div className="notes-takeaways-card">
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.86rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Zap size={14} color="var(--accent)" />
          <span>Key Takeaways</span>
        </h4>
        <div className="takeaways-grid">
          {notes.keyTakeaways.map((item, idx) => (
            <div key={idx} className="takeaway-item">
              <CheckCircle2 size={15} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ fontSize: '0.83rem', lineHeight: 1.45 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Outline */}
      <div className="notes-outline-section">
        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', fontWeight: 800 }}>
          Detailed Chapter Outline
        </h4>
        <div className="outline-list">
          {notes.outline.map((sec, idx) => {
            const isCollapsed = collapsedSections[idx];
            return (
              <div key={idx} className="outline-card">
                <div 
                  className="outline-header" 
                  onClick={() => toggleSection(idx)}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{sec.heading}</span>
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </div>
                {!isCollapsed && (
                  <div className="outline-body">
                    <p style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.55, color: 'var(--text-2)' }}>
                      {sec.content}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
