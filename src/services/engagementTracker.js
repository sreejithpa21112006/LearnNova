/**
 * Engagement Tracking Engine for Study Copilot
 * 
 * Non-invasive browser API monitoring:
 * - IntersectionObserver / Scroll tracking for current active chunk
 * - Dwell time accumulator vs expected reading dwell time
 * - Scroll velocity calculation (pixels/sec)
 * - Idle timer detection (mouse, keyboard, touch events)
 * - Tab visibility (Page Visibility API)
 * - Adaptive back-off: backs off nudges when ignored, prevents nagging
 */

export class EngagementTracker {
  constructor(options = {}) {
    this.chunks = options.chunks || [];
    this.sensitivity = options.sensitivity || "medium"; // 'low' | 'medium' | 'high'
    this.readingWpm = options.readingWpm || 200;
    this.isAvatarEnabled = options.isAvatarEnabled !== false;

    // Callbacks
    this.onStateChange = options.onStateChange || (() => {});
    this.onNudge = options.onNudge || (() => {});
    this.onCheckpoint = options.onCheckpoint || (() => {});
    this.onProgressUpdate = options.onProgressUpdate || (() => {});

    // Internal State
    this.activeChunkIndex = 0;
    this.chunkDwellTimes = {}; // chunkIndex -> seconds
    this.chunkStatus = {}; // chunkIndex -> 'unread' | 'reading' | 'completed'
    this.lastScrollTop = 0;
    this.lastScrollTime = Date.now();
    this.scrollVelocity = 0;
    this.idleSeconds = 0;
    this.currentState = "normal"; // 'normal' | 'skimming' | 'idle' | 'away'
    this.isTabActive = true;
    
    // Adaptive Back-off & Nag Prevention
    this.ignoredNudgesCount = 0;
    this.lastNudgeTime = 0;
    this.lastCheckpointTriggeredChunk = -1;
    this.checkpointsAnswered = new Set();

    // Timer refs
    this.tickerInterval = null;
    this.boundScrollHandler = this.handleScroll.bind(this);
    this.boundActivityHandler = this.resetIdle.bind(this);
    this.boundVisibilityHandler = this.handleVisibilityChange.bind(this);
  }

  start(scrollContainerElement) {
    this.container = scrollContainerElement || window;
    this.stop(); // Clear any existing

    // Listen to scroll events
    this.container.addEventListener("scroll", this.boundScrollHandler, { passive: true });
    
    // Listen to user activity to track idle state
    window.addEventListener("mousemove", this.boundActivityHandler, { passive: true });
    window.addEventListener("keydown", this.boundActivityHandler, { passive: true });
    window.addEventListener("touchstart", this.boundActivityHandler, { passive: true });
    document.addEventListener("visibilitychange", this.boundVisibilityHandler);

    // Start 1-second cadence ticker
    this.tickerInterval = setInterval(() => this.tick(), 1000);
  }

  stop() {
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
    if (this.container) {
      this.container.removeEventListener("scroll", this.boundScrollHandler);
    }
    window.removeEventListener("mousemove", this.boundActivityHandler);
    window.removeEventListener("keydown", this.boundActivityHandler);
    window.removeEventListener("touchstart", this.boundActivityHandler);
    document.removeEventListener("visibilitychange", this.boundVisibilityHandler);
  }

  updateChunks(chunks) {
    this.chunks = chunks;
    this.chunks.forEach((_, idx) => {
      if (!this.chunkDwellTimes[idx]) this.chunkDwellTimes[idx] = 0;
      if (!this.chunkStatus[idx]) this.chunkStatus[idx] = idx === 0 ? "reading" : "unread";
    });
  }

  setSensitivity(level) {
    this.sensitivity = level;
  }

  setAvatarEnabled(enabled) {
    this.isAvatarEnabled = enabled;
  }

  resetIdle() {
    this.idleSeconds = 0;
    if (this.currentState === "idle" && this.isTabActive) {
      this.transitionToState("normal");
    }
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.isTabActive = false;
      this.transitionToState("away");
    } else {
      this.isTabActive = true;
      this.resetIdle();
      this.transitionToState("normal");
    }
  }

  handleScroll() {
    const currentScrollTop = this.container === window 
      ? window.scrollY 
      : this.container.scrollTop;
    const now = Date.now();
    const timeDelta = Math.max(1, (now - this.lastScrollTime) / 1000); // in seconds
    const dist = Math.abs(currentScrollTop - this.lastScrollTop);

    // Calculate instantaneous velocity in pixels/sec
    this.scrollVelocity = dist / timeDelta;
    this.lastScrollTop = currentScrollTop;
    this.lastScrollTime = now;
    this.resetIdle();

    // Check which chunk is currently centered in the reading view
    this.detectCurrentChunk();
  }

  detectCurrentChunk() {
    if (!this.chunks || this.chunks.length === 0) return;

    const chunkElements = document.querySelectorAll("[data-chunk-index]");
    if (!chunkElements || chunkElements.length === 0) return;

    const viewportCenter = window.innerHeight / 2;
    let closestIndex = this.activeChunkIndex;
    let minDistance = Infinity;

    chunkElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const distance = Math.abs(elementCenter - viewportCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = parseInt(el.getAttribute("data-chunk-index"), 10);
      }
    });

    if (closestIndex !== this.activeChunkIndex) {
      this.onChunkBoundaryTransition(this.activeChunkIndex, closestIndex);
      this.activeChunkIndex = closestIndex;
    }
  }

  onChunkBoundaryTransition(prevIndex, newIndex) {
    if (newIndex > prevIndex) {
      // User scrolled forward into a new chunk!
      const prevChunk = this.chunks[prevIndex];
      const prevDwell = this.chunkDwellTimes[prevIndex] || 0;

      // Mark previous as completed if dwell was reasonable
      if (prevChunk && prevDwell >= prevChunk.minDwellSeconds) {
        this.chunkStatus[prevIndex] = "completed";
      }

      // Check if this was a fast skim past the chunk
      const sensitivityFactor = this.getSensitivityFactor();
      const skimThreshold = (prevChunk?.minDwellSeconds || 5) * sensitivityFactor;

      if (prevChunk && prevDwell < skimThreshold && this.scrollVelocity > 450) {
        this.handleSkimmingDetected(prevIndex, prevChunk);
      } else {
        // Normal transition: trigger section checkpoint if not already taken
        this.checkTriggerCheckpoint(prevIndex);
      }
    }
  }

  getSensitivityFactor() {
    switch (this.sensitivity) {
      case "low": return 0.6; // More forgiving, requires even lower dwell to trigger
      case "high": return 1.4; // Strict, triggers earlier
      default: return 1.0;
    }
  }

  getNudgeCooldown() {
    // If ignored repeatedly, back off gracefully
    let baseCooldown = 40; // seconds
    if (this.ignoredNudgesCount >= 2) baseCooldown = 75;
    if (this.ignoredNudgesCount >= 4) baseCooldown = 120;
    return baseCooldown;
  }

  handleSkimmingDetected(chunkIndex, chunk) {
    if (!this.isAvatarEnabled) return;

    const now = Date.now();
    const cooldownMs = this.getNudgeCooldown() * 1000;
    if (now - this.lastNudgeTime < cooldownMs) return;

    this.transitionToState("skimming");
    this.lastNudgeTime = now;

    const messages = [
      `Whoa, moving fast! "${chunk.title}" has dense concepts. Caught the main takeaway?`,
      `Glanced through "${chunk.title}" pretty quickly! Want a 10-second checkpoint?`,
      `Quick skim detected. Ensure you don't miss the key term: ${chunk.keyTerms?.[0] || 'key definition'}.`
    ];

    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    this.onNudge({
      type: "skimming",
      message: randomMsg,
      chunkIndex,
      chunkTitle: chunk.title
    });
  }

  checkTriggerCheckpoint(chunkIndex) {
    if (this.checkpointsAnswered.has(chunkIndex)) return;
    if (this.lastCheckpointTriggeredChunk === chunkIndex) return;

    this.lastCheckpointTriggeredChunk = chunkIndex;
    this.onCheckpoint(chunkIndex);
  }

  markCheckpointAnswered(chunkIndex) {
    this.checkpointsAnswered.add(chunkIndex);
    this.chunkStatus[chunkIndex] = "completed";
    this.ignoredNudgesCount = 0; // Reset back-off on genuine engagement!
  }

  recordNudgeDismissed() {
    this.ignoredNudgesCount++;
    if (this.ignoredNudgesCount >= 3) {
      // Trigger "Take a break" suggestion per PRD FR11
      this.onNudge({
        type: "break_suggestion",
        message: "You've been powering through some dense material! Want to take a 2-minute eye rest or switch to silent reading mode?",
        chunkIndex: this.activeChunkIndex
      });
    }
  }

  recordNudgeEngaged() {
    this.ignoredNudgesCount = 0;
  }

  transitionToState(newState) {
    if (this.currentState !== newState) {
      this.currentState = newState;
      this.onStateChange(newState, {
        activeChunkIndex: this.activeChunkIndex,
        dwellTime: this.chunkDwellTimes[this.activeChunkIndex] || 0,
        scrollVelocity: this.scrollVelocity,
        idleSeconds: this.idleSeconds
      });
    }
  }

  tick() {
    if (!this.isTabActive) return;

    // Accumulate dwell time on currently active chunk
    if (!this.chunkDwellTimes[this.activeChunkIndex]) {
      this.chunkDwellTimes[this.activeChunkIndex] = 0;
    }
    this.chunkDwellTimes[this.activeChunkIndex] += 1;

    // Check idle time
    this.idleSeconds += 1;
    const idleThreshold = this.sensitivity === "high" ? 35 : this.sensitivity === "low" ? 75 : 50;

    if (this.idleSeconds >= idleThreshold && this.currentState !== "idle") {
      this.handleIdleDetected();
    }

    // Report progress to parent
    this.onProgressUpdate({
      activeChunkIndex: this.activeChunkIndex,
      dwellTimes: { ...this.chunkDwellTimes },
      chunkStatus: { ...this.chunkStatus },
      scrollVelocity: Math.round(this.scrollVelocity),
      idleSeconds: this.idleSeconds
    });

    // Decay scroll velocity gradually
    this.scrollVelocity = Math.max(0, this.scrollVelocity * 0.7);
  }

  handleIdleDetected() {
    if (!this.isAvatarEnabled) return;

    const now = Date.now();
    const cooldownMs = this.getNudgeCooldown() * 1000;
    if (now - this.lastNudgeTime < cooldownMs) return;

    this.transitionToState("idle");
    this.lastNudgeTime = now;

    const chunk = this.chunks[this.activeChunkIndex];
    this.onNudge({
      type: "idle",
      message: `Still with me on "${chunk?.title || 'this section'}"? Want a quick 1-sentence summary or taking a short breather?`,
      chunkIndex: this.activeChunkIndex,
      chunkTitle: chunk?.title
    });
  }
}
