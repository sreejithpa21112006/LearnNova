import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Award, 
  ArrowRight, 
  RotateCcw, 
  Sparkles, 
  FileQuestion, 
  X 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { awardXp } from '../../services/gamificationService';
import { shuffleQuizQuestion } from '../../services/tutorService';
import { saveStudyActivity } from '../../services/storageService';

export default function PracticeExamModal({
  quiz = [],
  title = "Lecture Practice Exam",
  onClose,
  onComplete
}) {
  const [shuffledQuiz, setShuffledQuiz] = useState(() => (quiz || []).map(shuffleQuizQuestion));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const quizSignature = (quiz || []).map(q => q.id || q.question || '').join('||');
  const lastSignatureRef = useRef(quizSignature);

  useEffect(() => {
    if (lastSignatureRef.current !== quizSignature) {
      lastSignatureRef.current = quizSignature;
      setShuffledQuiz((quiz || []).map(shuffleQuizQuestion));
      setCurrentIndex(0);
      setSelectedAnswers({});
      setIsSubmitted(false);
      setScore(0);
    }
  }, [quizSignature, quiz]);

  const currentQ = shuffledQuiz[currentIndex] || shuffledQuiz[0] || {};
  const totalQuestions = shuffledQuiz.length;
  const isLast = currentIndex === totalQuestions - 1;
  const selectedOption = selectedAnswers[currentIndex];
  const hasAnsweredCurrent = selectedOption !== undefined;

  const handleSelectOption = (optIdx) => {
    if (hasAnsweredCurrent) return;
    setSelectedAnswers(prev => ({ ...prev, [currentIndex]: optIdx }));
  };

  const handleNext = () => {
    if (isLast) {
      let correctCount = 0;
      shuffledQuiz.forEach((q, idx) => {
        if (selectedAnswers[idx] === q.correctIndex) correctCount++;
      });
      setScore(correctCount);
      setIsSubmitted(true);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      awardXp('checkpoint_correct', 35, `+35 XP Exam Completed (${correctCount}/${totalQuestions})!`);

      // Auto-log exam results to study history
      const questionBreakdown = shuffledQuiz.map((q, idx) => ({
        question: q.question,
        isCorrect: selectedAnswers[idx] === q.correctIndex
      }));
      saveStudyActivity({
        type: 'quiz',
        title: title || 'Practice Exam',
        subtitle: `Diagnostic Assessment • ${correctCount}/${totalQuestions} Correct`,
        score: correctCount,
        totalQuestions,
        accuracy: Math.round((correctCount / totalQuestions) * 100),
        questions: questionBreakdown,
        xpEarned: 35
      });

      onComplete?.(correctCount, totalQuestions);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleRestart = () => {
    setShuffledQuiz(quiz.map(shuffleQuizQuestion));
    setCurrentIndex(0);
    setSelectedAnswers({});
    setIsSubmitted(false);
    setScore(0);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="brand-icon" style={{ width: '32px', height: '32px' }}>
              <FileQuestion size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{title}</h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>
                Bloom's Taxonomy Diagnostic Assessment
              </span>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {!isSubmitted ? (
          <div>
            {/* Progress Track */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-3)', marginBottom: '8px' }}>
              <span>Question {currentIndex + 1} of {totalQuestions}</span>
              <span>{Math.round(((currentIndex + 1) / totalQuestions) * 100)}%</span>
            </div>
            <div className="progress-bar-container" style={{ marginBottom: '20px' }}>
              <div 
                className="progress-bar-fill" 
                style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }} 
              />
            </div>

            {/* Question Text */}
            <h4 style={{ fontSize: '1.05rem', lineHeight: 1.45, marginBottom: '18px', fontWeight: 700 }}>
              {currentQ.question}
            </h4>

            {/* Options List */}
            <div className="quiz-options-list">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = selectedOption === optIdx;
                const isCorrect = optIdx === currentQ.correctIndex;
                let optionStyle = '';

                if (hasAnsweredCurrent) {
                  if (isCorrect) optionStyle = 'correct-opt';
                  else if (isSelected) optionStyle = 'wrong-opt';
                }

                return (
                  <button
                    key={optIdx}
                    className={`quiz-option-btn ${isSelected ? 'selected' : ''} ${optionStyle}`}
                    onClick={() => handleSelectOption(optIdx)}
                  >
                    <span className="opt-letter">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="opt-text">{opt}</span>
                    {hasAnsweredCurrent && isCorrect && <CheckCircle2 size={16} color="#10b981" />}
                    {hasAnsweredCurrent && isSelected && !isCorrect && <XCircle size={16} color="#ef4444" />}
                  </button>
                );
              })}
            </div>

            {/* Answer Rationale */}
            {hasAnsweredCurrent && (
              <div className="quiz-rationale-box">
                <span style={{ fontWeight: 700, fontSize: '0.78rem', color: selectedOption === currentQ.correctIndex ? 'var(--accent)' : 'var(--text-2)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {selectedOption === currentQ.correctIndex ? (
                    <>
                      <CheckCircle2 size={13} color="var(--accent)" />
                      Correct Answer!
                    </>
                  ) : (
                    'Explanation:'
                  )}
                </span>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text-2)' }}>
                  {currentQ.explanation}
                </p>
              </div>
            )}

            {/* Footer Navigation */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                className="btn btn-primary"
                disabled={!hasAnsweredCurrent}
                onClick={handleNext}
              >
                <span>{isLast ? 'Finish Exam' : 'Next Question'}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        ) : (
          /* Results View */
          <div style={{ textAlign: 'center', padding: '24px 10px' }}>
            <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', marginBottom: '14px' }}>
              <Award size={42} color="var(--accent)" />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>
              Exam Complete!
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', marginBottom: '20px' }}>
              You scored <strong style={{ color: 'var(--accent)' }}>{score}</strong> out of <strong>{totalQuestions}</strong> ({Math.round((score / totalQuestions) * 100)}%)
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={handleRestart}>
                <RotateCcw size={15} /> Try Again
              </button>
              <button className="btn btn-primary" onClick={onClose}>
                Done & Review Decks
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
