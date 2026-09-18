import React from 'react';
import { 
  FolderHeart, 
  Brain, 
  Download, 
  Trash2, 
  Calendar, 
  Layers, 
  Clock, 
  Plus,
  BookOpen
} from 'lucide-react';
import { getDeckStats, exportToAnkiTsv, downloadFile } from '../services/sm2Service';

export default function DeckListView({
  decks = [],
  onSelectDeckToStudy,
  onOpenCardStudio,
  onDeleteDeck,
  onSwitchToReading
}) {
  const handleExportAnki = (deck, e) => {
    e.stopPropagation();
    const tsvData = exportToAnkiTsv(deck);
    const filename = `${deck.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_anki.txt`;
    downloadFile(tsvData, filename, "text/tab-separated-values;charset=utf-8;");
  };

  const handleExportJson = (deck, e) => {
    e.stopPropagation();
    const jsonData = JSON.stringify(deck, null, 2);
    const filename = `${deck.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    downloadFile(jsonData, filename, "application/json;charset=utf-8;");
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
      {/* View Header */}
      <div className="reading-header-bar">
        <div>
          <span className="doc-category-tag">
            <FolderHeart size={13} /> Saved Repetition Decks
          </span>
          <h1 className="doc-title" style={{ marginTop: '6px' }}>Your Flashcard Library</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', marginTop: '4px' }}>
            Review decks scheduled with SuperMemo SM-2 or export directly into Anki.
          </p>
        </div>

        <button className="btn btn-primary" onClick={onSwitchToReading}>
          <BookOpen size={16} />
          <span>Read & Generate More</span>
        </button>
      </div>

      {/* Decks Grid */}
      {decks.length === 0 ? (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-xl)',
          padding: '60px 20px',
          textAlign: 'center'
        }}>
          <FolderHeart size={48} color="var(--accent)" style={{ margin: '0 auto 16px auto' }} />
          <h2>No Saved Flashcard Decks Yet</h2>
          <p style={{ color: 'var(--text-2)', maxWidth: '460px', margin: '8px auto 20px auto' }}>
            Read a dense study document with LearnNova to automatically extract checkpoint questions and generate cards!
          </p>
          <button className="btn btn-primary" onClick={onSwitchToReading}>
            <BookOpen size={16} />
            <span>Open Study Document</span>
          </button>
        </div>
      ) : (
        <div className="deck-grid">
          {decks.map(deck => {
            const stats = getDeckStats(deck.cards);

            return (
              <div key={deck.id} className="deck-card">
                <div className="deck-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="card-type-tag">
                      {stats.total} Flashcards
                    </span>

                    {stats.due > 0 ? (
                      <span className="due-badge" title="Cards due for SM-2 review today">
                        ● {stats.due} Due Today
                      </span>
                    ) : (
                      <span style={{ color: 'var(--green)', fontSize: '0.8rem', fontWeight: 600 }}>
                        ✓ All Caught Up
                      </span>
                    )}
                  </div>

                  <h2 className="deck-title">{deck.title}</h2>

                  <div className="deck-stats-row">
                    <span>Mastered: <strong>{stats.mastered}</strong></span>
                    <span>•</span>
                    <span>Learning: <strong>{stats.learning}</strong></span>
                    <span>•</span>
                    <span>Retention: <strong>{stats.retentionRate}%</strong></span>
                  </div>
                </div>

                {/* Deck Card Action Footer */}
                <div className="deck-actions">
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      className="btn btn-ghost btn-icon"
                      onClick={(e) => handleExportAnki(deck, e)}
                      title="Export Anki TSV file"
                      style={{ width: '32px', height: '32px' }}
                    >
                      <Download size={15} />
                    </button>

                    <button 
                      className="btn btn-ghost btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete deck "${deck.title}"?`)) {
                          onDeleteDeck(deck.id);
                        }
                      }}
                      title="Delete deck"
                      style={{ width: '32px', height: '32px', color: 'var(--red)' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => onOpenCardStudio(deck)}
                      style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                    >
                      <Layers size={14} />
                      <span>Edit</span>
                    </button>

                    <button 
                      className="btn btn-primary"
                      onClick={() => onSelectDeckToStudy(deck)}
                      style={{ padding: '6px 16px', fontSize: '0.84rem' }}
                    >
                      <Brain size={15} />
                      <span>Study</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
