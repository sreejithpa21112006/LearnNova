import React, { useState } from 'react';
import { 
  Layers, 
  Trash2, 
  Edit3, 
  Plus, 
  Save, 
  RotateCw, 
  Check, 
  Sparkles, 
  Bookmark, 
  Download,
  X,
  PenTool,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { exportToAnkiTsv, downloadFile } from '../services/sm2Service';
import { evaluateFlashcardAnswer } from '../services/tutorService';

export default function DeckReviewModal({
  deck,
  onSaveDeck,
  onRegenerateDeck,
  onClose,
  density,
  onChangeDensity,
  geminiApiKey = ''
}) {
  const [deckTitle, setDeckTitle] = useState(deck?.title || 'Untitled Study Deck');
  const [cards, setCards] = useState(deck?.cards || []);
  const [editingCardId, setEditingCardId] = useState(null);

  // In-Studio Card Testing State
  const [testingCardId, setTestingCardId] = useState(null);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [isTestEvaluating, setIsTestEvaluating] = useState(false);

  const handleUpdateCardField = (id, field, value) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleDeleteCard = (id) => {
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const handleAddCard = () => {
    const newCard = {
      id: `custom-${Date.now()}`,
      type: "custom",
      sourceChunkTitle: "Custom Addition",
      question: "Enter your question here...",
      answer: "Enter your answer here...",
      tags: ["custom"],
      repetition: 0,
      interval: 1,
      easeFactor: 2.5
    };
    setCards([newCard, ...cards]);
    setEditingCardId(newCard.id);
  };

  const handleSave = () => {
    const updatedDeck = {
      ...deck,
      title: deckTitle,
      cards,
      cardCount: cards.length,
      updatedAt: new Date().toISOString()
    };
    onSaveDeck(updatedDeck);
  };

  const handleExportAnki = () => {
    const tsvData = exportToAnkiTsv({ ...deck, title: deckTitle, cards });
    const filename = `${deckTitle.replace(/\s+/g, '_')}_anki.txt`;
    downloadFile(tsvData, filename, "text/tab-separated-values;charset=utf-8;");
  };

  return (
    <div className="study-container" style={{ maxWidth: '960px', margin: '20px auto' }}>
      {/* Studio Header */}
      <div className="reading-header-bar" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span className="doc-category-tag">
              <Layers size={13} /> Card Studio & Deck Review
            </span>
            <input 
              type="text"
              value={deckTitle}
              onChange={(e) => setDeckTitle(e.target.value)}
              className="form-input"
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                marginTop: '8px',
                background: 'transparent',
                border: '1px dashed var(--border)',
                width: '100%',
                maxWidth: '600px'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              className="btn btn-secondary"
              onClick={handleExportAnki}
              title="Export Anki-compatible TSV file"
            >
              <Download size={15} />
              <span>Export Anki</span>
            </button>

            <button 
              className="btn btn-primary"
              onClick={handleSave}
              title="Save to local library and open in Study Mode"
            >
              <Save size={16} />
              <span>Save Deck ({cards.length} cards)</span>
            </button>
          </div>
        </div>

        {/* Studio Controls Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border)',
          paddingTop: '14px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Card Density Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
            <span style={{ color: 'var(--text-2)' }}>Card Density:</span>
            {['low', 'medium', 'high'].map(lvl => (
              <button
                key={lvl}
                className={`btn ${density === lvl ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 12px', fontSize: '0.8rem', textTransform: 'capitalize' }}
                onClick={() => {
                  onChangeDensity(lvl);
                  onRegenerateDeck(lvl);
                }}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-secondary"
              onClick={() => onRegenerateDeck(density)}
              style={{ padding: '6px 14px', fontSize: '0.84rem' }}
            >
              <RotateCw size={14} />
              <span>Regenerate</span>
            </button>

            <button 
              className="btn btn-secondary"
              onClick={handleAddCard}
              style={{ padding: '6px 14px', fontSize: '0.84rem' }}
            >
              <Plus size={15} />
              <span>Add Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {cards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', background: 'var(--surface)', borderRadius: 'var(--r-lg)' }}>
            <p style={{ color: 'var(--text-2)' }}>No cards in this deck yet. Click "Add Card" or read a document to generate cards.</p>
          </div>
        ) : (
          cards.map((card, idx) => {
            const isEditing = editingCardId === card.id;

            return (
              <div 
                key={card.id || idx}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)',
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'border-color 0.2s ease'
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="card-type-tag">
                      {card.type === 'checkpoint-qa' ? 'Checkpoint Q&A' :
                       card.type === 'cloze' ? 'Cloze Deletion' :
                       card.type === 'definition' ? 'Definition' :
                       card.type === 'tradeoff' ? 'Trade-off' : 'Flashcard'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                      Source: {card.sourceChunkTitle || 'Reading Material'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        if (testingCardId === card.id) {
                          setTestingCardId(null);
                          setTestResult(null);
                          setTestInput('');
                        } else {
                          setTestingCardId(card.id);
                          setTestResult(null);
                          setTestInput('');
                        }
                      }}
                      title="Test typing your own answer with AI"
                      style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Sparkles size={13} color="var(--accent)" />
                      <span>{testingCardId === card.id ? "Close Test" : "Test Recall"}</span>
                    </button>

                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => setEditingCardId(isEditing ? null : card.id)}
                      title={isEditing ? "Finish editing" : "Edit card"}
                      style={{ width: '32px', height: '32px' }}
                    >
                      {isEditing ? <Check size={16} color="var(--green)" /> : <Edit3 size={15} />}
                    </button>

                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => handleDeleteCard(card.id)}
                      title="Delete card"
                      style={{ width: '32px', height: '32px', color: 'var(--red)' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Card Fields: Question & Answer */}
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Question / Prompt:</label>
                      <input 
                        type="text" 
                        value={card.question} 
                        onChange={(e) => handleUpdateCardField(card.id, 'question', e.target.value)}
                        className="form-input" 
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Answer:</label>
                      <textarea 
                        rows={2} 
                        value={card.answer} 
                        onChange={(e) => handleUpdateCardField(card.id, 'answer', e.target.value)}
                        className="form-textarea" 
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {card.question}
                    </div>
                    <div style={{ fontSize: '0.94rem', color: 'var(--text-2)', background: 'var(--surface-2)', padding: '12px 16px', borderRadius: 'var(--r-md)' }}>
                      <strong>Answer:</strong> {card.answer}
                    </div>
                    {card.explanation && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
                        Note: {card.explanation}
                      </div>
                    )}
                  </div>
                )}

                {/* AI Recall Test Drawer */}
                {testingCardId === card.id && (
                  <div style={{
                    marginTop: '12px',
                    padding: '16px',
                    background: 'var(--surface-2)',
                    border: '1px solid rgba(127, 29, 58, 0.22)',
                    borderRadius: 'var(--r-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <PenTool size={13} /> Active Recall: Type your answer to test AI closeness
                      </span>
                      {testResult && (
                        <span className={`ai-score-pill ${
                          testResult.score >= 85 ? 'near-perfect' :
                          testResult.score >= 70 ? 'strong' :
                          testResult.score >= 45 ? 'partial' : 'needs-review'
                        }`} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
                          {testResult.score}% Match • {testResult.verdict}
                        </span>
                      )}
                    </div>

                    <textarea
                      rows={2}
                      className="form-textarea"
                      placeholder="Type what you remember about this card..."
                      value={testInput}
                      onChange={e => setTestInput(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (!testInput.trim() || isTestEvaluating) return;
                          setIsTestEvaluating(true);
                          try {
                            const res = await evaluateFlashcardAnswer({
                              question: card.question,
                              targetAnswer: card.answer,
                              userAnswer: testInput.trim(),
                              apiKey: geminiApiKey
                            });
                            setTestResult(res);
                          } finally {
                            setIsTestEvaluating(false);
                          }
                        }
                      }}
                      style={{ fontSize: '0.9rem' }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                        Press [Enter] to check similarity
                      </span>
                      <button
                        className="btn btn-primary"
                        onClick={async () => {
                          if (!testInput.trim() || isTestEvaluating) return;
                          setIsTestEvaluating(true);
                          try {
                            const res = await evaluateFlashcardAnswer({
                              question: card.question,
                              targetAnswer: card.answer,
                              userAnswer: testInput.trim(),
                              apiKey: geminiApiKey
                            });
                            setTestResult(res);
                          } finally {
                            setIsTestEvaluating(false);
                          }
                        }}
                        disabled={isTestEvaluating || !testInput.trim()}
                        style={{ padding: '5px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        {isTestEvaluating ? <Loader2 size={13} className="spin-icon" /> : <Sparkles size={13} />}
                        <span>{isTestEvaluating ? "Analyzing..." : "Evaluate with AI"}</span>
                      </button>
                    </div>

                    {testResult && (
                      <div style={{ marginTop: '8px', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--r-sm)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <p style={{ margin: '0 0 6px 0', fontSize: '0.84rem', color: 'var(--text-2)' }}>
                          {testResult.feedback}
                        </p>
                        {(testResult.strengths?.length > 0 || testResult.gaps?.length > 0) && (
                          <div className="ai-points-row" style={{ marginTop: '6px' }}>
                            {testResult.strengths?.map((s, i) => (
                              <span key={`ts-${i}`} className="ai-point-chip strength">
                                <CheckCircle2 size={11} /> {s}
                              </span>
                            ))}
                            {testResult.gaps?.map((g, i) => (
                              <span key={`tg-${i}`} className="ai-point-chip gap">
                                <AlertCircle size={11} /> {g}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Save Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', gap: '12px' }}>
        <button className="btn btn-secondary" onClick={onClose}>
          Back to Reading
        </button>
        <button className="btn btn-primary" onClick={handleSave} style={{ padding: '10px 28px' }}>
          <Save size={16} />
          <span>Save & Start Study Mode</span>
        </button>
      </div>
    </div>
  );
}
