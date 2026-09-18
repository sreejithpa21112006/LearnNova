import React, { useState } from 'react';
import { 
  Settings, 
  Sliders, 
  Eye, 
  Sparkles, 
  Clock, 
  Layers, 
  X, 
  Key, 
  Save, 
  CheckCircle2 
} from 'lucide-react';

export default function SettingsModal({
  settings,
  onSaveSettings,
  onClose
}) {
  const [formData, setFormData] = useState({ ...settings });
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveSettings(formData);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="brand-icon" style={{ width: '32px', height: '32px' }}>
              <Settings size={18} />
            </div>
            <h2 style={{ fontSize: '1.25rem' }}>LearnNova Settings</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Avatar Sensitivity */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Nudge Sensitivity (PRD FR9)</span>
              <span style={{ color: 'var(--accent)', textTransform: 'capitalize' }}>
                {formData.sensitivity}
              </span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'low', label: 'Low', desc: 'Permissive, fewer nudges' },
                { id: 'medium', label: 'Medium', desc: 'Standard CSE pace' },
                { id: 'high', label: 'High', desc: 'Strict attentiveness' }
              ].map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  className={`btn ${formData.sensitivity === opt.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFormData({ ...formData, sensitivity: opt.id })}
                  style={{ display: 'flex', flexDirection: 'column', padding: '10px 8px', textAlign: 'center' }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{opt.label}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reading Speed Slider */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Calibrated Reading Speed (WPM)</span>
              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                {formData.readingWpm} WPM
              </span>
            </label>
            <input 
              type="range" 
              min={120} 
              max={400} 
              step={10} 
              value={formData.readingWpm}
              onChange={(e) => setFormData({ ...formData, readingWpm: parseInt(e.target.value, 10) })}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', margin: 0 }}>
              Average technical undergrad reading speed is ~180-220 WPM for dense papers.
            </p>
          </div>

          {/* Default Card Density */}
          <div className="form-group">
            <label className="form-label">Default Flashcard Density (PRD FR14)</label>
            <select
              className="form-select"
              value={formData.cardDensity}
              onChange={(e) => setFormData({ ...formData, cardDensity: e.target.value })}
            >
              <option value="low">Low (~1 card per section)</option>
              <option value="medium">Medium (~2-3 cards per section)</option>
              <option value="high">High (~4+ cards per section - Comprehensive)</option>
            </select>
          </div>

          {/* Optional Gemini API Key */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={14} />
              <span>Optional Gemini API Key:</span>
            </label>
            <input 
              type="password"
              placeholder="AIzaSy... (leave blank to use built-in 100% offline engine)"
              value={formData.geminiApiKey || ''}
              onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value })}
              className="form-input" 
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', margin: 0 }}>
              LearnNova includes a built-in NLP heuristics engine that works 100% offline. Adding a key enables live generative LLM synthesis.
            </p>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              <span>{isSaved ? 'Saved!' : 'Save Preferences'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
