import React from 'react';

/**
 * MascotSvg.jsx
 * 
 * Expressive animated mascot inspired by StudyFetch's Sparky & Duolingo's mascot.
 * States:
 * - 'cheering': Confetti, star/heart eyes, leaping wings/arms, happy smile
 * - 'thinking': Hand on chin, curious eyebrows, rotating idea ring
 * - 'nudge': Pointing at watch, tapping foot, urgent attentiveness
 * - 'study': Scholarly glasses, holding a book, nodding
 * - 'sleep': Sleeping eyes, floating Zzzs
 * - 'calling': Phone receiver / glowing audio soundwaves
 * - 'normal': Warm, encouraging smile, gentle breathing
 */
export default function MascotSvg({ state = 'normal', size = 80, skin = 'sparky-pup' }) {
  const isCheering = state === 'cheering';
  const isThinking = state === 'thinking';
  const isNudge = state === 'nudge' || state === 'skimming';
  const isSleep = state === 'sleep' || state === 'idle';
  const isStudy = state === 'study';
  const isCalling = state === 'calling';

  return (
    <svg 
      viewBox="0 0 160 160" 
      width={size} 
      height={size} 
      style={{ overflow: 'visible', display: 'block', transition: 'all 0.3s ease' }}
    >
      <defs>
        {/* Glow & Shadow Filters */}
        <filter id="mascot-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Gradients */}
        <linearGradient id="body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7F1D3A" />
          <stop offset="100%" stopColor="#4D0E1F" />
        </linearGradient>

        <linearGradient id="pup-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9B2C4D" />
          <stop offset="100%" stopColor="#5B1924" />
        </linearGradient>

        <linearGradient id="belly-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F7F1E8" />
        </linearGradient>

        <linearGradient id="cap-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4D0E1F" />
          <stop offset="100%" stopColor="#24161A" />
        </linearGradient>
      </defs>

      {/* Floating Shadow */}
      <ellipse cx="80" cy="148" rx="42" ry="6" fill="rgba(36, 22, 26, 0.15)" />

      {/* Confetti & Sparkles for Cheering */}
      {isCheering && (
        <g className="mascot-sparkles">
          <circle cx="28" cy="30" r="3.5" fill="#7F1D3A" />
          <circle cx="132" cy="26" r="4" fill="#9B2C4D" />
          <circle cx="140" cy="70" r="3" fill="#67122B" />
          <circle cx="20" cy="80" r="3.5" fill="#B76E79" />
          <path d="M78 12 L82 22 L92 22 L84 28 L87 38 L80 32 L73 38 L76 28 L68 22 L78 22 Z" fill="#7F1D3A" />
        </g>
      )}

      {/* Sleeping Zzzs */}
      {isSleep && (
        <g className="mascot-zzz" fill="#7F1D3A" fontWeight="bold" fontFamily="sans-serif">
          <text x="110" y="44" fontSize="14" opacity="0.9">Z</text>
          <text x="122" y="32" fontSize="18" opacity="0.7">z</text>
          <text x="134" y="20" fontSize="22" opacity="0.5">z</text>
        </g>
      )}

      {/* Audio Wave / Calling Glow */}
      {isCalling && (
        <g stroke="#7F1D3A" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <path d="M120 40 A20 20 0 0 1 120 75" opacity="0.8" />
          <path d="M128 32 A30 30 0 0 1 128 83" opacity="0.5" />
        </g>
      )}

      {/* Body */}
      <g transform={isCheering ? "translate(0, -6)" : isThinking ? "rotate(-3 80 80)" : ""}>
        {/* Main Torso */}
        <ellipse 
          cx="80" 
          cy="92" 
          rx="52" 
          ry="48" 
          fill={skin === 'sparky-pup' ? "url(#pup-grad)" : "url(#body-grad)"} 
        />

        {/* Belly Patch */}
        <ellipse cx="80" cy="100" rx="34" ry="32" fill="url(#belly-grad)" />

        {/* Pup Ears or Owl Feathers */}
        {skin === 'sparky-pup' ? (
          <g>
            {/* Floppy Dog Ears */}
            <path d="M34 50 C20 40, 12 75, 24 95 C30 85, 36 70, 38 60 Z" fill="#4D0E1F" />
            <path d="M126 50 C140 40, 148 75, 136 95 C130 85, 124 70, 122 60 Z" fill="#4D0E1F" />
          </g>
        ) : (
          <g>
            {/* Owl Ear Tufts */}
            <polygon points="40,55 26,30 52,42" fill="#4D0E1F" />
            <polygon points="120,55 134,30 108,42" fill="#4D0E1F" />
          </g>
        )}

        {/* Arms / Wings */}
        {isCheering ? (
          <g fill={skin === 'sparky-pup' ? "#67122B" : "#5B1924"}>
            {/* Raised celebration wings */}
            <path d="M32 82 C10 65, 8 40, 22 46 C34 52, 38 70, 36 82 Z" />
            <path d="M128 82 C150 65, 152 40, 138 46 C126 52, 122 70, 124 82 Z" />
          </g>
        ) : isThinking ? (
          <g fill={skin === 'sparky-pup' ? "#67122B" : "#5B1924"}>
            <path d="M32 90 C22 98, 20 115, 34 112 C44 110, 42 98, 38 90 Z" />
            {/* Hand on chin */}
            <path d="M126 95 C115 90, 95 95, 96 85 C98 75, 115 80, 126 88 Z" />
          </g>
        ) : isNudge ? (
          <g fill={skin === 'sparky-pup' ? "#67122B" : "#5B1924"}>
            {/* Tapping watch */}
            <path d="M30 92 C18 90, 20 115, 35 110 Z" />
            <path d="M128 92 C115 95, 102 108, 112 115 C122 120, 132 105, 130 92 Z" />
            {/* Little Wristwatch */}
            <circle cx="116" cy="112" r="6" fill="#24161A" stroke="#7F1D3A" strokeWidth="1.5" />
            <line x1="116" y1="112" x2="116" y2="108" stroke="#ffffff" strokeWidth="1.5" />
          </g>
        ) : (
          <g fill={skin === 'sparky-pup' ? "#67122B" : "#5B1924"}>
            {/* Resting wings */}
            <ellipse cx="28" cy="95" rx="10" ry="20" transform="rotate(12 28 95)" />
            <ellipse cx="132" cy="95" rx="10" ry="20" transform="rotate(-12 132 95)" />
          </g>
        )}

        {/* Eyes */}
        {isSleep ? (
          <g stroke="#374151" strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M54 75 Q64 82 74 75" />
            <path d="M86 75 Q96 82 106 75" />
          </g>
        ) : isCheering ? (
          <g>
            {/* Star / Heart Eyes */}
            <circle cx="64" cy="74" r="9" fill="#f43f5e" />
            <circle cx="96" cy="74" r="9" fill="#f43f5e" />
            <path d="M64 71 L66 76 L70 76 L67 79 L68 83 L64 80 L60 83 L61 79 L58 76 L62 76 Z" fill="#ffffff" />
            <path d="M96 71 L98 76 L102 76 L99 79 L100 83 L96 80 L92 83 L93 79 L90 76 L94 76 Z" fill="#ffffff" />
          </g>
        ) : isNudge ? (
          <g>
            {/* Big focused watchful eyes */}
            <circle cx="64" cy="73" r="10" fill="#ffffff" stroke="#1f2937" strokeWidth="2" />
            <circle cx="64" cy="73" r="5" fill="#f59e0b" />
            <circle cx="65" cy="71" r="2" fill="#ffffff" />
            <circle cx="96" cy="73" r="10" fill="#ffffff" stroke="#1f2937" strokeWidth="2" />
            <circle cx="96" cy="73" r="5" fill="#f59e0b" />
            <circle cx="97" cy="71" r="2" fill="#ffffff" />
          </g>
        ) : (
          <g>
            {/* Friendly big expressive eyes */}
            <ellipse cx="64" cy="74" rx="10" ry="12" fill="#ffffff" stroke="#1f2937" strokeWidth="1.5" />
            <ellipse cx="65" cy="75" rx="6" ry="8" fill="#1e1b4b" />
            <circle cx="67" cy="72" r="2.5" fill="#ffffff" />
            <circle cx="63" cy="77" r="1.2" fill="#ffffff" />

            <ellipse cx="96" cy="74" rx="10" ry="12" fill="#ffffff" stroke="#1f2937" strokeWidth="1.5" />
            <ellipse cx="95" cy="75" rx="6" ry="8" fill="#1e1b4b" />
            <circle cx="97" cy="72" r="2.5" fill="#ffffff" />
            <circle cx="93" cy="77" r="1.2" fill="#ffffff" />
          </g>
        )}

        {/* Eyeglasses for Study Mode */}
        {isStudy && (
          <g stroke="#0f172a" strokeWidth="3" fill="rgba(255,255,255,0.25)">
            <circle cx="64" cy="74" r="14" />
            <circle cx="96" cy="74" r="14" />
            <line x1="78" y1="74" x2="82" y2="74" strokeWidth="3" />
          </g>
        )}

        {/* Nose / Beak */}
        {skin === 'sparky-pup' ? (
          <g>
            {/* Cute Dog Nose */}
            <ellipse cx="80" cy="84" rx="5" ry="3.5" fill="#1f2937" />
            <path d="M80 87.5 L80 91 Q75 94 72 91 M80 91 Q85 94 88 91" stroke="#1f2937" strokeWidth="1.5" fill="none" />
          </g>
        ) : (
          <polygon points="75,82 85,82 80,90" fill="#f59e0b" />
        )}

        {/* Graduation Cap */}
        <g transform="translate(18, -4) rotate(-5 80 40)">
          <polygon points="50,42 80,30 110,42 80,52" fill="url(#cap-grad)" stroke="#4338ca" strokeWidth="1.5" />
          <path d="M62,47 Q80,58 98,47 L96,52 Q80,63 64,52 Z" fill="#312e81" />
          <line x1="80" y1="41" x2="108" y2="52" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="108" cy="53" r="3" fill="#f59e0b" />
        </g>

        {/* Cheeks Blush */}
        <ellipse cx="50" cy="85" rx="6" ry="3.5" fill="#f43f5e" opacity="0.35" />
        <ellipse cx="110" cy="85" rx="6" ry="3.5" fill="#f43f5e" opacity="0.35" />

        {/* Feet */}
        <ellipse cx="65" cy="140" rx="10" ry="5" fill="#f59e0b" />
        <ellipse cx="95" cy="140" rx="10" ry="5" fill="#f59e0b" />
      </g>
    </svg>
  );
}
