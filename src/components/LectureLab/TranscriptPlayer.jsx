import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Search, 
  Clock, 
  FileText,
  ExternalLink
} from 'lucide-react';

/**
 * TranscriptPlayer.jsx
 * 
 * Synchronized Media Player & Interactive Transcript:
 * - Supports HTML5 Audio/Video or YouTube embeds
 * - Click any timestamp to jump playback directly to that second
 * - Automatically scrolls and highlights the currently active spoken sentence
 * - Search filter for keywords within the lecture
 */
export default function TranscriptPlayer({
  lecture,
  currentTime,
  onSeekTime,
  isPlaying,
  onTogglePlay
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const activeLineRef = useRef(null);

  // Find currently active transcript segment
  const activeIndex = lecture.transcript.findIndex(
    seg => currentTime >= seg.start && currentTime <= seg.end
  );

  // Auto-scroll active segment into view
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeIndex]);

  const filteredTranscript = lecture.transcript.filter(seg =>
    !searchQuery.trim() || seg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="transcript-player-container">
      {/* Media Player Bar */}
      <div className="media-playback-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="btn btn-primary btn-icon" 
            style={{ width: '40px', height: '40px', borderRadius: '50%' }}
            onClick={onTogglePlay}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
          </button>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700 }}>{lecture.title}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                {formatTime(currentTime)} / {formatTime(lecture.durationSeconds || 180)}
              </span>
              {lecture.youtubeId && (
                <span className="source-tag">
                  YouTube: {lecture.youtubeId}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Search within transcript */}
        <div className="transcript-search-box">
          <Search size={14} color="var(--text-3)" />
          <input
            type="text"
            placeholder="Search spoken keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Progress Scrubber */}
      <div className="transcript-scrubber">
        <input 
          type="range"
          min={0}
          max={lecture.durationSeconds || 180}
          value={currentTime}
          onChange={(e) => onSeekTime(parseFloat(e.target.value))}
          className="scrubber-slider"
        />
      </div>

      {/* Transcript Scrolling Feed */}
      <div className="transcript-scroll-list">
        {filteredTranscript.map((seg, idx) => {
          const isActive = activeIndex === idx;
          return (
            <div
              key={idx}
              ref={isActive ? activeLineRef : null}
              className={`transcript-row ${isActive ? 'active' : ''}`}
              onClick={() => onSeekTime(seg.start)}
            >
              <button className="timestamp-badge" title="Jump to timestamp">
                <Clock size={11} />
                <span>{formatTime(seg.start)}</span>
              </button>
              <p className="transcript-text">
                {seg.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
