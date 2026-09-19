import React, { useState } from 'react';
import { 
  Settings, 
  Sliders, 
  Eye, 
  EyeOff,
  Sparkles, 
  Clock, 
  Layers, 
  X, 
  Key, 
  Lock,
  ShieldCheck,
  Save, 
  CheckCircle2,
  Bot,
  GraduationCap
} from 'lucide-react';

export default function SettingsModal({
  settings,
  onSaveSettings,
  onClose
}) {
  const [formData, setFormData] = useState({ ...settings });
  const [isSaved, setIsSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

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

          {/* Spaced Repetition Algorithm */}
          <div className="form-group">
            <label className="form-label">Spaced Repetition Memory Algorithm</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${formData.algorithm === 'fsrs' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFormData({ ...formData, algorithm: 'fsrs' })}
                style={{ display: 'flex', flexDirection: 'column', padding: '10px 8px', textAlign: 'center' }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>FSRS (Modern)</span>
                <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>Adaptive forgetting curves</span>
              </button>
              <button
                type="button"
                className={`btn ${formData.algorithm === 'sm2' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFormData({ ...formData, algorithm: 'sm2' })}
                style={{ display: 'flex', flexDirection: 'column', padding: '10px 8px', textAlign: 'center' }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>SM-2 (Classic)</span>
                <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>SuperMemo 2 multiplier</span>
              </button>
            </div>
          </div>

          {/* Mascot Skin & Voice */}
          <div className="form-group">
            <label className="form-label">AI Mascot Companion Persona</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${formData.mascotSkin === 'sparky-pup' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => setFormData({ ...formData, mascotSkin: 'sparky-pup' })}
              >
                <Bot size={15} />
                <span>Sparky (Companion)</span>
              </button>
              <button
                type="button"
                className={`btn ${formData.mascotSkin === 'duo-owl' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => setFormData({ ...formData, mascotSkin: 'duo-owl' })}
              >
                <GraduationCap size={15} />
                <span>Nova (Scholar)</span>
              </button>
            </div>
          </div>

          {/* Voice Speech Synthesis Toggle */}
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <label className="form-label" style={{ margin: 0 }}>Mascot Voice Synthesis</label>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-3)' }}>Speak encouraging lines and explanations aloud</p>
            </div>
            <button
              type="button"
              className={`btn ${formData.isMascotVoiceEnabled ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              onClick={() => setFormData({ ...formData, isMascotVoiceEnabled: !formData.isMascotVoiceEnabled })}
            >
              {formData.isMascotVoiceEnabled ? 'Voice ON' : 'Muted'}
            </button>
          </div>

          {/* Default Card Density */}
          <div className="form-group">
            <label className="form-label">Default Flashcard Density</label>
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

          {/* Gemini API Key */}
          <div className="form-group" style={{ background: 'var(--surface-2)', padding: '14px 16px', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <Key size={14} color="var(--accent)" />
                <span style={{ fontWeight: 600 }}>Gemini API Key</span>
              </label>
              {formData.geminiApiKey ? (
                <span style={{ fontSize: '0.72rem', color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> Key Connected & Masked
                </span>
              ) : (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.74rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
                >
                  Get free key ↗
                </a>
              )}
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showApiKey ? "text" : "password"}
                placeholder="AIzaSy... (paste your Gemini API key here)"
                value={formData.geminiApiKey || ''}
                onChange={(e) => setFormData({ ...formData, geminiApiKey: e.target.value.trim() })}
                className="form-input" 
                autoComplete="off"
                spellCheck="false"
                style={{ 
                  width: '100%', 
                  paddingRight: formData.geminiApiKey ? '72px' : '40px', 
                  fontFamily: showApiKey ? 'var(--mono)' : 'sans-serif', 
                  fontSize: '0.84rem',
                  letterSpacing: showApiKey ? 'normal' : '0.18em'
                }}
              />
              <div style={{ position: 'absolute', right: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: showApiKey ? 'var(--accent)' : 'var(--text-3)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    transition: 'color 0.15s ease'
                  }}
                  title={showApiKey ? "Hide key (mask with bullets)" : "Reveal key"}
                  aria-label={showApiKey ? "Hide key" : "Show key"}
                >
                  {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                {formData.geminiApiKey && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, geminiApiKey: '' })}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-3)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      borderRadius: '4px'
                    }}
                    title="Clear key"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '9px', fontSize: '0.72rem', color: 'var(--text-2)', lineHeight: 1.4 }}>
              <ShieldCheck size={14} color="var(--green)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                <strong>Client-Side Protected:</strong> Stored strictly in your browser's local sandbox. Never sent to any custom server or third-party loggers.
              </span>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-3)', marginTop: '6px', lineHeight: 1.45 }}>
              Unlocks conversational AI, intelligent card generation, and adaptive tutor reasoning. Leave blank to run 100% offline via local NLP.
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
