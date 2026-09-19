import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  HelpCircle,
  PenTool,
  Loader2,
  AlertCircle,
  Send,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { calculateCardReview, calculateSM2, isCardDue } from '../services/sm2Service';
import { awardXp } from '../services/gamificationService';
import { evaluateFlashcardAnswer, speakMascotVoice } from '../services/tutorService';
import { saveStudyActivity } from '../services/storageService';

export default function StudyMode({
  deck,
  onUpdateCard,
  onFinishSession,
  onBackToDecks,
  algorithm = 'fsrs',
  geminiApiKey = '',
  isMascotVoiceEnabled = false
}) {
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [sessionResults, setSessionResults] = useState([]);

  // Type-Your-Answer and AI Closeness Evaluation State
  const [studyInputMode, setStudyInputMode] = useState('type'); // 'type' | 'flip'
  const [userAnswer, setUserAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState(null);
  const textareaRef = useRef(null);

  // Initialize cards due for review or full deck
  useEffect(() => {
    if (deck && deck.cards) {
      const dueCards = deck.cards.filter(isCardDue);
      const studyDeck = dueCards.length > 0 ? dueCards : [...deck.cards];
      setCards(studyDeck);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsSessionComplete(false);
      setSessionResults([]);
      setUserAnswer('');
      setAiEvaluation(null);
    }
  }, [deck]);

  const currentCard = cards[currentIndex];

  // Auto-focus textarea on card change
  useEffect(() => {
    setUserAnswer('');
    setIsEvaluating(false);
    setAiEvaluation(null);
    setIsFlipped(false);

    if (studyInputMode === 'type') {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 80);
    }
  }, [currentIndex, currentCard?.id, studyInputMode]);

  // Handle AI Evaluation of User Typed Answer
  const handleCheckAnswer = async (e) => {
    if (e) e.stopPropagation();
    if (!currentCard || !userAnswer.trim() || isEvaluating) return;

    setIsEvaluating(true);
    try {
      const evalResult = await evaluateFlashcardAnswer({
        question: currentCard.question,
        targetAnswer: currentCard.answer,
        userAnswer: userAnswer.trim(),
        apiKey: geminiApiKey
      });

      setAiEvaluation(evalResult);
      setIsFlipped(true);

      // Celebrate high recall with confetti
      if (evalResult.score >= 80) {
        try {
          confetti({
            particleCount: 65,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch (err) {}
      }

      // Voice mascot line if audio enabled
      if (isMascotVoiceEnabled) {
        speakMascotVoice(`${evalResult.verdict}! ${evalResult.feedback}`, true);
      }
    } catch (err) {
      console.warn("Flashcard AI evaluation failed:", err);
      setIsFlipped(true);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCheckAnswer();
    }
  };

  // Handle Card Grading with FSRS / SM-2
  const handleGrade = useCallback((gradeValue) => {
    if (!currentCard) return;

    // SM-2 grade mapping: 
    // 1: Again (q=1, reset to 1d)
    // 2: Hard (q=3, pass with difficulty)
    // 3: Good (q=4, solid recall)
    // 4: Easy (q=5, perfect recall)
    const sm2Grade = gradeValue === 1 ? 1 : gradeValue === 2 ? 3 : gradeValue === 3 ? 4 : 5;

    let xpAmount = 5;
    let label = "+5 XP Card Recalled!";
    if (gradeValue === 4) { xpAmount = 12; label = "+12 XP Perfect Recall!"; }
    else if (gradeValue === 3) { xpAmount = 8; label = "+8 XP Solid Recall!"; }
    else if (gradeValue === 2) { xpAmount = 5; label = "+5 XP Tough Recall!"; }
    else if (gradeValue === 1) { xpAmount = 2; label = "+2 XP Practice Makes Progress!"; }

    awardXp('card_review', xpAmount, label);

    const updated = calculateCardReview(currentCard, sm2Grade, algorithm);
    onUpdateCard(deck.id, updated);

    // Auto-log to user's study history with traceback details
    const gradeLabels = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };
    saveStudyActivity({
      type: 'flashcard',
      title: currentCard.question.slice(0, 48) + (currentCard.question.length > 48 ? '...' : ''),
      subtitle: `${deck?.title || 'Flashcard Deck'} • ${algorithm.toUpperCase()}`,
      deckId: deck?.id,
      cardId: currentCard.id,
      question: currentCard.question,
      userAnswer: userAnswer.trim(),
      targetAnswer: currentCard.answer,
      aiScore: aiEvaluation?.score,
      aiVerdict: aiEvaluation?.verdict,
      aiFeedback: aiEvaluation?.feedback,
      grade: gradeValue,
      gradeLabel: gradeLabels[gradeValue] || 'Reviewed',
      algorithm,
      xpEarned: xpAmount
    });

    setSessionResults(prev => [...prev, { 
      card: currentCard, 
      grade: gradeValue, 
      xp: xpAmount, 
      updated,
      aiScore: aiEvaluation?.score
    }]);

    setIsFlipped(false);
    setAiEvaluation(null);
    setUserAnswer('');

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsSessionComplete(true);
      awardXp('session_complete', 25, '+25 XP Study Session Complete!');
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }
  }, [currentCard, currentIndex, cards.length, deck?.id, onUpdateCard, algorithm, aiEvaluation]);

  // Keyboard Shortcuts (Space to flip when not in textarea, 1-4 to grade)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSessionComplete) return;

      // Don't intercept typing in inputs
      if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (isFlipped) {
        if (e.key === '1') handleGrade(1);
        else if (e.key === '2') handleGrade(2);
        else if (e.key === '3') handleGrade(3);
        else if (e.key === '4') handleGrade(4);
        else if ((e.key === 'Enter' || e.code === 'Space') && aiEvaluation?.suggestedGrade) {
          handleGrade(aiEvaluation.suggestedGrade);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, isSessionComplete, handleGrade, aiEvaluation]);

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
    const totalSessionXp = sessionResults.reduce((acc, r) => acc + (r.xp || 5), 0) + 25;

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
            Great active recall session on <strong>{deck.title}</strong>. Your next review intervals have been updated in accordance with the {algorithm.toUpperCase()} algorithm.
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
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent)' }}>+{totalSessionXp}</div>
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
                setAiEvaluation(null);
                setUserAnswer('');
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
    <div className="study-container" style={{ maxWidth: '760px', margin: '0 auto' }}>
      {/* Session Header */}
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

      {/* Mode Selector Pill Toggle */}
      <div className="study-mode-toggle-bar">
        <div className="mode-pill-selector">
          <button 
            type="button"
            className={`mode-pill-btn ${studyInputMode === 'type' ? 'active' : ''}`}
            onClick={() => {
              setStudyInputMode('type');
              setIsFlipped(false);
            }}
          >
            <PenTool size={13} />
            <span>Type Answer & AI Grade</span>
          </button>
          <button 
            type="button"
            className={`mode-pill-btn ${studyInputMode === 'flip' ? 'active' : ''}`}
            onClick={() => setStudyInputMode('flip')}
          >
            <RotateCw size={13} />
            <span>Flip Card Only</span>
          </button>
        </div>

        <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
          {studyInputMode === 'type' 
            ? 'Type your answer to see AI semantic closeness' 
            : 'Traditional 3D Flip Flashcards'}
        </span>
      </div>

      {/* 3D Flashcard Stage */}
      <div 
        className={`flashcard-stage ${studyInputMode === 'type' ? 'type-mode' : ''}`}
        onClick={() => {
          if (studyInputMode === 'flip') {
            setIsFlipped(prev => !prev);
          }
        }}
      >
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

            {/* Question Text */}
            <div className="flashcard-main-text">
              {currentCard.type === 'cloze' ? (
                formatClozeQuestion(currentCard.question)
              ) : (
                currentCard.question
              )}
            </div>

            {/* Type Answer Mode: Input Box & AI Evaluate Button */}
            {studyInputMode === 'type' ? (
              <div className="type-answer-box" onClick={e => e.stopPropagation()}>
                <textarea
                  ref={textareaRef}
                  className="type-answer-textarea"
                  placeholder="Type your answer in your own words to test your recall with AI..."
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  rows={3}
                  disabled={isEvaluating}
                />
                <div className="type-answer-actions">
                  <span className="type-hint">
                    <Sparkles size={12} color="var(--accent)" />
                    <span>Press <strong>[Enter]</strong> to check with AI</span>
                  </span>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button"
                      className="btn btn-ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFlipped(true);
                      }}
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    >
                      Skip & Flip
                    </button>

                    <button 
                      type="button"
                      className="btn btn-primary"
                      onClick={handleCheckAnswer}
                      disabled={isEvaluating || !userAnswer.trim()}
                      style={{ fontSize: '0.82rem', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      {isEvaluating ? (
                        <>
                          <Loader2 size={14} className="spin-icon" />
                          <span>Evaluating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          <span>Check with AI</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flashcard-hint-footer">
                <span>Click card or press <strong>[Space]</strong> to flip</span>
              </div>
            )}
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

            {/* AI Evaluation Report (If user typed an answer) */}
            {aiEvaluation ? (
              <div className="ai-closeness-card" onClick={e => e.stopPropagation()}>
                <div className="ai-closeness-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} color="var(--accent)" />
                    <span style={{ fontWeight: 800, fontSize: '0.92rem' }}>AI Semantic Evaluation</span>
                  </div>

                  <div className={`ai-score-pill ${
                    aiEvaluation.score >= 85 ? 'near-perfect' :
                    aiEvaluation.score >= 70 ? 'strong' :
                    aiEvaluation.score >= 45 ? 'partial' : 'needs-review'
                  }`}>
                    <span>{aiEvaluation.score}% Match</span>
                    <span>•</span>
                    <span>{aiEvaluation.verdict}</span>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                  {aiEvaluation.feedback}
                </p>

                {(aiEvaluation.strengths?.length > 0 || aiEvaluation.gaps?.length > 0) && (
                  <div className="ai-points-row">
                    {aiEvaluation.strengths?.map((s, i) => (
                      <span key={`s-${i}`} className="ai-point-chip strength">
                        <CheckCircle2 size={11} /> {s}
                      </span>
                    ))}
                    {aiEvaluation.gaps?.map((g, i) => (
                      <span key={`g-${i}`} className="ai-point-chip gap">
                        <AlertCircle size={11} /> {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Side-by-Side Comparison */}
                <div className="ai-comparison-grid">
                  <div className="ai-comparison-pane user-pane">
                    <span className="ai-comparison-label">
                      <PenTool size={11} /> Your Typed Response
                    </span>
                    <p className="ai-comparison-text">{userAnswer || '(Empty)'}</p>
                  </div>

                  <div className="ai-comparison-pane target-pane">
                    <span className="ai-comparison-label">
                      <CheckCircle2 size={11} color="var(--green)" /> Official Target Answer
                    </span>
                    <p className="ai-comparison-text">{currentCard.answer}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flashcard-main-text" style={{ color: 'var(--text-main)', textAlign: 'left', padding: '16px' }}>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 700, marginBottom: '6px' }}>
                  Target Answer:
                </div>
                {currentCard.answer}
              </div>
            )}

            {currentCard.explanation && !aiEvaluation && (
              <div style={{ fontSize: '0.88rem', color: 'var(--text-2)', background: 'rgba(255, 255, 255, 0.04)', padding: '10px 16px', borderRadius: 'var(--r-sm)', margin: '8px 0' }}>
                {currentCard.explanation}
              </div>
            )}

            <div className="flashcard-hint-footer">
              <span>{aiEvaluation ? 'Grade your retention based on AI assessment below' : 'Self-grade your recall quality below'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SM-2 / FSRS Self-Grading Buttons (Active when flipped) */}
      <div style={{ minHeight: '80px', marginTop: '14px' }}>
        {isFlipped ? (
          <div className="sm2-grading-bar">
            <button 
              className={`grade-btn again ${aiEvaluation?.suggestedGrade === 1 ? 'ai-suggested' : ''}`} 
              onClick={() => handleGrade(1)}
            >
              {aiEvaluation?.suggestedGrade === 1 && <span className="ai-suggested-tag">AI Pick</span>}
              <span className="grade-label" style={{ color: 'var(--red)' }}>Again</span>
              <span className="grade-sub">&lt; 1 day</span>
              <span className="grade-shortcut">Key [1]</span>
            </button>

            <button 
              className={`grade-btn hard ${aiEvaluation?.suggestedGrade === 2 ? 'ai-suggested' : ''}`} 
              onClick={() => handleGrade(2)}
            >
              {aiEvaluation?.suggestedGrade === 2 && <span className="ai-suggested-tag">AI Pick</span>}
              <span className="grade-label" style={{ color: 'var(--amber)' }}>Hard</span>
              <span className="grade-sub">1 day</span>
              <span className="grade-shortcut">Key [2]</span>
            </button>

            <button 
              className={`grade-btn good ${aiEvaluation?.suggestedGrade === 3 ? 'ai-suggested' : ''}`} 
              onClick={() => handleGrade(3)}
            >
              {aiEvaluation?.suggestedGrade === 3 && <span className="ai-suggested-tag">AI Pick</span>}
              <span className="grade-label" style={{ color: 'var(--accent)' }}>Good</span>
              <span className="grade-sub">Optimal</span>
              <span className="grade-shortcut">Key [3]</span>
            </button>

            <button 
              className={`grade-btn easy ${aiEvaluation?.suggestedGrade === 4 ? 'ai-suggested' : ''}`} 
              onClick={() => handleGrade(4)}
            >
              {aiEvaluation?.suggestedGrade === 4 && <span className="ai-suggested-tag">AI Pick</span>}
              <span className="grade-label" style={{ color: 'var(--green)' }}>Easy</span>
              <span className="grade-sub">Long interval</span>
              <span className="grade-shortcut">Key [4]</span>
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => setIsFlipped(true)}
              style={{ padding: '8px 20px' }}
            >
              <Eye size={15} />
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
