import React, { useState, useEffect, useCallback } from 'react';
import { 
  Brain, 
  RotateCw, 
  CheckCircle2, 
  Sparkles, 
  ArrowLeft, 
  BarChart2, 
  Calendar, 
  Award,
  Layers,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { calculateSM2, isCardDue } from '../services/sm2Service';

export default function StudyMode({
  deck,
  onUpdateCard,
  onFinishSession,
  onBackToDecks
}) {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [sessionResults, setSessionResults] = useState([]);

  // Initialize cards due for review or full deck
  useEffect(() => {
    if (deck && deck.cards) {
      // Prioritize due cards; if none due, review all
      const dueCards = deck.cards.filter(isCardDue);
      const studyDeck = dueCards.length > 0 ? dueCards : [...deck.cards];
      setCards(studyDeck);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsSessionComplete(false);
      setSessionResults([]);
    }
  }, [deck]);

  const currentCard = cards[currentIndex];

  // Handle Card Grading with SM-2
  const handleGrade = useCallback((gradeValue) => {
    if (!currentCard) return;

    // SM-2 grade mapping: 
    // 1: Again (q=1, reset to 1d)
    // 2: Hard (q=3, pass with difficulty)
    // 3: Good (q=4, solid recall)
    // 4: Easy (q=5, perfect recall)
    const sm2Grade = gradeValue === 1 ? 1 : gradeValue === 2 ? 3 : gradeValue === 3 ? 4 : 5;

    const updated = calculateSM2(currentCard, sm2Grade);
    onUpdateCard(deck.id, updated);

    setSessionResults(prev => [...prev, { card: currentCard, grade: gradeValue, updated }]);

    setIsFlipped(false);

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsSessionComplete(true);
      // Trigger celebratory confetti on completion
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }
  }, [currentCard, currentIndex, cards.length, deck?.id, onUpdateCard]);

  // Keyboard Shortcuts (Space to flip, 1-4 to grade)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSessionComplete) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (isFlipped) {
        if (e.key === '1') handleGrade(1);
        else if (e.key === '2') handleGrade(2);
        else if (e.key === '3') handleGrade(3);
        else if (e.key === '4') handleGrade(4);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, isSessionComplete, handleGrade]);

  if (!deck || cards.length === 0) {
    return (
      <div className="study-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <Brain size={48} color="var(--accent)" style={{ margin: '0 auto 16px auto' }} />
        <h2>No Cards Available to Study</h2>
        <p style={{ color: 'var(--text-2)', marginBottom: '24px' }}>
          Select or generate a deck with flashcards to begin your spaced repetition session.
        </p>
        <button className="btn btn-primary" onClick={onBackToDecks}>
          Go to My Decks
        </button>
      </div>
    );
  }

  // Session Completed Screen
  if (isSessionComplete) {
    const correctCount = sessionResults.filter(r => r.grade >= 2).length;
    const accuracy = Math.round((correctCount / Math.max(1, sessionResults.length)) * 100);

    return (
      <div className="study-container">
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-xl)',
          padding: '48px 36px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Award size={36} />
          </div>

          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Review Session Complete!</h1>
          <p style={{ color: 'var(--text-2)', maxWidth: '460px', margin: '0 auto' }}>
            Great active recall session on <strong>{deck.title}</strong>. Your next review intervals have been updated in accordance with the SuperMemo SM-2 algorithm.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            width: '100%',
            maxWidth: '520px',
            margin: '20px 0'
          }}>
            <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent)' }}>{sessionResults.length}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Cards Studied</div>
            </div>

            <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--green)' }}>{accuracy}%</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Recall Accuracy</div>
            </div>

            <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent)' }}>+{correctCount * 10}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>XP Earned</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={onBackToDecks}>
              <ArrowLeft size={16} />
              <span>Back to Decks</span>
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => {
                setCurrentIndex(0);
                setIsFlipped(false);
                setIsSessionComplete(false);
                setSessionResults([]);
              }}
            >
              <RotateCw size={16} />
              <span>Study Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Flashcard Review Interface
  return (
    <div className="study-container">
      {/* Session Progress Header */}
      <div className="study-header">
        <button 
          className="btn btn-ghost" 
          onClick={onBackToDecks}
          style={{ padding: '6px 12px', fontSize: '0.84rem' }}
        >
          <ArrowLeft size={15} />
          <span>Exit Session</span>
        </button>

        <div className="study-progress-info">
          <span style={{ fontWeight: 600 }}>{deck.title}</span>
          <span>•</span>
          <span>Card <strong>{currentIndex + 1}</strong> of {cards.length}</span>
        </div>
      </div>

      {/* 3D Flip Flashcard */}
      <div className="flashcard-stage" onClick={() => setIsFlipped(prev => !prev)}>
        <div className={`flashcard-inner ${isFlipped ? 'is-flipped' : ''}`}>
          {/* Front Face */}
          <div className="flashcard-face flashcard-front">
            <div className="flashcard-top">
              <span className="card-type-tag">
                {currentCard.type === 'cloze' ? 'Cloze Deletion' :
                 currentCard.type === 'checkpoint-qa' ? 'Reading Checkpoint' : 'Conceptual Recall'}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                {currentCard.repetition > 0 ? `Repetition ${currentCard.repetition}` : 'New Card'}
              </span>
            </div>

            <div className="flashcard-main-text">
              {currentCard.type === 'cloze' ? (
                formatClozeQuestion(currentCard.question)
              ) : (
                currentCard.question
              )}
            </div>

            <div className="flashcard-hint-footer">
              <span>Click card or press <strong>[Space]</strong> to flip</span>
            </div>
          </div>

          {/* Back Face */}
          <div className="flashcard-face flashcard-back">
            <div className="flashcard-top">
              <span className="card-type-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--green)' }}>
                Target Answer
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                Ease Factor: {currentCard.easeFactor || 2.5}
              </span>
            </div>

            <div className="flashcard-main-text" style={{ color: 'var(--text-main)' }}>
              {currentCard.answer}
            </div>

            {currentCard.explanation && (
              <div style={{ fontSize: '0.88rem', color: 'var(--text-2)', background: 'rgba(255, 255, 255, 0.04)', padding: '10px 16px', borderRadius: 'var(--r-sm)' }}>
                {currentCard.explanation}
              </div>
            )}

            <div className="flashcard-hint-footer">
              <span>Self-grade your recall quality below</span>
            </div>
          </div>
        </div>
      </div>

      {/* SM-2 Self-Grading Buttons (Active when flipped) */}
      <div style={{ minHeight: '80px' }}>
        {isFlipped ? (
          <div className="sm2-grading-bar">
            <button className="grade-btn again" onClick={() => handleGrade(1)}>
              <span className="grade-label" style={{ color: 'var(--red)' }}>Again</span>
              <span className="grade-sub">&lt; 1 day</span>
              <span className="grade-shortcut">Key [1]</span>
            </button>

            <button className="grade-btn hard" onClick={() => handleGrade(2)}>
              <span className="grade-label" style={{ color: 'var(--amber)' }}>Hard</span>
              <span className="grade-sub">1 day</span>
              <span className="grade-shortcut">Key [2]</span>
            </button>

            <button className="grade-btn good" onClick={() => handleGrade(3)}>
              <span className="grade-label" style={{ color: 'var(--accent)' }}>Good</span>
              <span className="grade-sub">Optimal</span>
              <span className="grade-shortcut">Key [3]</span>
            </button>

            <button className="grade-btn easy" onClick={() => handleGrade(4)}>
              <span className="grade-label" style={{ color: 'var(--green)' }}>Easy</span>
              <span className="grade-sub">Long interval</span>
              <span className="grade-shortcut">Key [4]</span>
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => setIsFlipped(true)}
              style={{ padding: '10px 24px' }}
            >
              <RotateCw size={16} />
              <span>Reveal Answer [Space]</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatClozeQuestion(text) {
  if (!text) return null;
  const parts = text.split(/(\[\.\.\.\])/g);
  return parts.map((part, idx) => {
    if (part === '[...]') {
      return (
        <span key={idx} className="cloze-blank">
          [ ... ]
        </span>
      );
    }
    return part;
  });
}
