import React from 'react';
import { Lightbulb, Layers, Award, Sparkles, BookMarked } from 'lucide-react';

/**
 * KeyConceptsGlossary.jsx
 * 
 * Displays core lecture terminology cards with real-world analogies
 * and direct one-click flashcard creation.
 */
export default function KeyConceptsGlossary({ concepts = [], onAddConceptToDeck }) {
  return (
    <div className="concepts-glossary-container">
      <div className="concepts-header">
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
            Key Concepts & Mental Models
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-3)' }}>
            High-yield terminology with intuitive analogies to anchor your understanding.
          </p>
        </div>
      </div>

      <div className="concepts-grid">
        {concepts.map((item, idx) => (
          <div key={idx} className="concept-card">
            <div className="concept-card-top">
              <span className="concept-term-title">{item.term}</span>
              <span className={`difficulty-badge ${item.difficulty?.toLowerCase()}`}>
                {item.difficulty || 'Medium'}
              </span>
            </div>

            <p className="concept-definition">
              {item.definition}
            </p>

            {item.analogy && (
              <div className="concept-analogy-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <Lightbulb size={13} color="#f59e0b" />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>
                    Mental Analogy
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-2)', fontStyle: 'italic' }}>
                  "{item.analogy}"
                </p>
              </div>
            )}

            {onAddConceptToDeck && (
              <button 
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}
                onClick={() => onAddConceptToDeck(item)}
              >
                <Layers size={13} />
                <span>Add to Flashcard Deck</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
