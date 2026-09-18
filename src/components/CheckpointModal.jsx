import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  BookOpen, 
  HelpCircle,
  BookmarkPlus
} from 'lucide-react';

export default function CheckpointModal({
  checkpointData,
  onComplete,
  onClose
}) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);

  if (!checkpointData) return null;

  const {
    question,
    options = [],
    correctIndex = 0,
    explanation,
    chunkTitle,
    chunkIndex
  } = checkpointData;

  const isCorrect = selectedOption === correctIndex;

  const handleSelectOption = (idx) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);
  };

  const handleContinue = () => {
    onComplete({
      chunkIndex,
      chunkTitle,
      question,
      options,
      correctIndex,
      userAnswerIndex: selectedOption,
      isCorrect,
      explanation
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        {/* Header Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span className="checkpoint-badge">
            <Sparkles size={14} /> Section Checkpoint
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
            Section {chunkIndex + 1}: {chunkTitle}
          </span>
        </div>

        {/* Question Title */}
        <h2 className="checkpoint-question">{question}</h2>

        {/* Option Selectors */}
        <div className="checkpoint-options">
          {options.map((opt, idx) => {
            let stateClass = '';
            if (isAnswered) {
              if (idx === correctIndex) stateClass = 'selected-correct';
              else if (idx === selectedOption) stateClass = 'selected-wrong';
            }

            return (
              <button
                key={idx}
                className={`checkpoint-option-btn ${stateClass}`}
                onClick={() => handleSelectOption(idx)}
                disabled={isAnswered}
              >
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--surface-2)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span style={{ flex: 1 }}>{opt}</span>
                {isAnswered && idx === correctIndex && (
                  <CheckCircle2 size={16} color="var(--green)" />
                )}
                {isAnswered && idx === selectedOption && idx !== correctIndex && (
                  <XCircle size={16} color="var(--red)" />
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback & Explanation */}
        {isAnswered && (
          <div className="checkpoint-explanation">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              {isCorrect ? (
                <strong style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={16} /> Spot on!
                </strong>
              ) : (
                <strong style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <XCircle size={16} /> Key Concept to Reinforce
                </strong>
              )}
              <span style={{ fontSize: '0.76rem', color: 'var(--accent)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <BookmarkPlus size={13} /> Queued for Spaced Repetition Deck
              </span>
            </div>
            <p style={{ margin: 0 }}>{explanation}</p>
          </div>
        )}

        {/* Modal Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button 
            className="btn btn-ghost"
            onClick={onClose}
          >
            Skip for Now
          </button>

          <button 
            className="btn btn-primary"
            onClick={handleContinue}
            disabled={!isAnswered}
          >
            <span>Continue Reading</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
