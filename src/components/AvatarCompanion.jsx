import React from 'react';
import {
  Bot,
  Sparkles,
  Coffee,
  Activity,
  Sliders,
  Eye,
  AlertTriangle,
  Clock,
  X
} from 'lucide-react';

export default function AvatarCompanion({
  isAvatarEnabled,
  engagementState,
  activeNudge,
  onDismissNudge,
  onEngageNudge,
  onTriggerCheckpoint,
  sensitivity,
  onChangeSensitivity,
  telemetry = {},
  activeChunk
}) {
  const dwellSec = telemetry.dwellTimes?.[activeChunk?.index] || 0;
  const expectedDwell = activeChunk?.expectedDwellSeconds || 30;
  const dwellProgress = Math.min(100, Math.round((dwellSec / Math.max(1, expectedDwell)) * 100));

  if (!isAvatarEnabled) {
    return (
      <aside className="companion-sidebar">
        <div className="avatar-companion-card" style={{ opacity: 0.55 }}>
          <div className="avatar-stage">
            <div className="avatar-svg-container" style={{ filter: 'grayscale(1)' }}>
              <RobotSvg state="disabled" />
            </div>
          </div>
          <div className="avatar-status-badge away">Copilot Off</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.5 }}>
            Toggle Copilot in the navbar to enable real-time reading engagement tracking.
          </p>
        </div>
      </aside>
    );
  }

  const stateLabel = {
    normal: 'Attentive',
    skimming: 'Skim Alert',
    idle: 'Idle',
    away: 'Tab Away'
  }[engagementState] || 'Attentive';

  const stateClass = engagementState === 'normal' ? 'attentive' : engagementState;

  return (
    <aside className="companion-sidebar">
      {/* Main avatar card */}
      <div className="avatar-companion-card">
        <div className={`avatar-stage ${engagementState}`}>
          <div className="avatar-svg-container">
            <RobotSvg state={engagementState} />
          </div>
        </div>

        <div className={`avatar-status-badge ${stateClass}`}>
          {engagementState === 'normal' && <Eye size={12} />}
          {engagementState === 'skimming' && <AlertTriangle size={12} />}
          {engagementState === 'idle' && <Clock size={12} />}
          {engagementState === 'away' && <Coffee size={12} />}
          {stateLabel}
        </div>

        {/* Nudge or passive message */}
        {activeNudge ? (
          <div className="avatar-speech-bubble">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <p style={{ margin: 0, fontWeight: 500, fontSize: '0.84rem', color: 'var(--text)' }}>
                {activeNudge.message}
              </p>
              <button
                onClick={onDismissNudge}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </div>
            <div className="bubble-actions">
              {activeNudge.type === 'break_suggestion' ? (
                <button
                  className="bubble-btn bubble-btn-primary"
                  onClick={() => { onEngageNudge(); }}
                >
                  <Coffee size={12} style={{ marginRight: 4 }} />
                  Take a break
                </button>
              ) : (
                <button className="bubble-btn bubble-btn-primary" onClick={onTriggerCheckpoint}>
                  <Sparkles size={12} style={{ marginRight: 4 }} />
                  Quick Check
                </button>
              )}
              <button className="bubble-btn bubble-btn-ghost" onClick={onDismissNudge}>
                Still reading
              </button>
            </div>
          </div>
        ) : (
          <div className="avatar-speech-bubble" style={{ borderStyle: 'dashed' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-2)' }}>
              {activeChunk
                ? <>Watching <strong style={{ color: 'var(--text)' }}>{activeChunk.title}</strong>. I'll nudge you if you skim.</>
                : 'Ready. Start scrolling to begin your session.'}
            </p>
          </div>
        )}
      </div>

      {/* Telemetry card */}
      <div className="telemetry-card">
        <div className="telemetry-title">
          <span>Telemetry</span>
          <Activity size={13} color="var(--accent)" />
        </div>

        <div className="telemetry-row">
          <span style={{ color: 'var(--text-2)' }}>Section dwell</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="dwell-mini-bar" style={{ width: '52px' }}>
              <div
                className="dwell-mini-fill"
                style={{
                  width: `${dwellProgress}%`,
                  background: dwellProgress >= 80 ? 'var(--green)' : 'var(--accent)'
                }}
              />
            </div>
            <span className="telemetry-val">{dwellSec}s / {expectedDwell}s</span>
          </div>
        </div>

        <div className="telemetry-row">
          <span style={{ color: 'var(--text-2)' }}>Scroll speed</span>
          <span
            className="telemetry-val"
            style={{ color: (telemetry.scrollVelocity || 0) > 400 ? 'var(--amber)' : undefined }}
          >
            {telemetry.scrollVelocity || 0} px/s
          </span>
        </div>

        <div className="telemetry-row">
          <span style={{ color: 'var(--text-2)' }}>Idle timer</span>
          <span className="telemetry-val">{telemetry.idleSeconds || 0}s</span>
        </div>
      </div>

      {/* Sensitivity picker */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.78rem'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-2)' }}>
          <Sliders size={12} /> Sensitivity
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['low', 'medium', 'high'].map(lvl => (
            <button
              key={lvl}
              onClick={() => onChangeSensitivity(lvl)}
              style={{
                padding: '3px 8px',
                borderRadius: 'var(--r-pill)',
                border: '1px solid',
                borderColor: sensitivity === lvl ? 'var(--accent)' : 'var(--border)',
                background: sensitivity === lvl ? 'var(--accent-bg)' : 'transparent',
                color: sensitivity === lvl ? 'var(--accent)' : 'var(--text-3)',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all .15s'
              }}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function RobotSvg({ state = 'normal' }) {
  const isSkimming = state === 'skimming';
  const isIdle = state === 'idle';
  const isAway = state === 'away' || state === 'disabled';

  return (
    <svg viewBox="0 0 140 140" width="100%" height="100%" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e4e4e7" />
        </linearGradient>
        <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
      </defs>

      <ellipse cx="70" cy="132" rx="34" ry="5" fill="url(#shadowGrad)" />

      {/* Antenna */}
      <line x1="70" y1="28" x2="70" y2="15" stroke="#a1a1aa" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="70" cy="14" r="5.5" fill={isSkimming ? '#d97706' : '#4f46e5'} />
      <circle cx="70" cy="14" r="2.5" fill="#ffffff" />

      {/* Head body */}
      <rect x="30" y="28" width="80" height="74" rx="22" fill="url(#bodyGrad)" stroke="#d4d4d8" strokeWidth="2" />

      {/* Screen */}
      <rect x="38" y="38" width="64" height="48" rx="12" fill="url(#screenGrad)" stroke="#27272a" strokeWidth="1.5" />

      {/* Eyes */}
      {isSkimming ? (
        <g>
          <circle cx="56" cy="62" r="8.5" fill="#d97706" />
          <circle cx="56" cy="62" r="3.5" fill="#fff" />
          <circle cx="84" cy="62" r="8.5" fill="#d97706" />
          <circle cx="84" cy="62" r="3.5" fill="#fff" />
          <path d="M67 47 L67 54" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
          <circle cx="67" cy="57" r="1.5" fill="#d97706" />
        </g>
      ) : isIdle ? (
        <g>
          <path d="M48 65 Q56 59 64 65" stroke="#8b5cf6" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M76 65 Q84 59 92 65" stroke="#8b5cf6" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <text x="95" y="45" fill="#8b5cf6" fontSize="11" fontWeight="bold" fontFamily="sans-serif">z</text>
        </g>
      ) : isAway ? (
        <g>
          <line x1="48" y1="62" x2="64" y2="62" stroke="#71717a" strokeWidth="3" strokeLinecap="round" />
          <line x1="76" y1="62" x2="92" y2="62" stroke="#71717a" strokeWidth="3" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          <circle cx="56" cy="62" r="8" fill="#16a34a" />
          <circle cx="58" cy="60" r="3" fill="#fff" />
          <circle cx="84" cy="62" r="8" fill="#16a34a" />
          <circle cx="86" cy="60" r="3" fill="#fff" />
          <path d="M63 73 Q70 77 77 73" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      )}

      {/* Graduation cap */}
      <g transform="translate(18, 12) rotate(-8 70 20)">
        <polygon points="50,16 85,6 120,16 85,26" fill="url(#capGrad)" stroke="#312e81" strokeWidth="1.5" />
        <path d="M65,22 Q85,32 105,22 L103,26 Q85,36 67,26 Z" fill="#3730a3" />
        <line x1="85" y1="16" x2="114" y2="28" stroke="#f59e0b" strokeWidth="1.5" />
        <circle cx="114" cy="29" r="2.5" fill="#f59e0b" />
      </g>

      {/* Hands */}
      <circle cx="22" cy="74" r="7.5" fill="#e4e4e7" stroke="#a1a1aa" strokeWidth="1.5" />
      <circle cx="118" cy="74" r="7.5" fill="#e4e4e7" stroke="#a1a1aa" strokeWidth="1.5" />
    </svg>
  );
}
