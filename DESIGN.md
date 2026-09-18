---
name: StudyCopilot-AdaptiveEdTech
description: A friendly, high-focus, claymorphic EdTech design system tailored for CSE undergrads. Synthesizes attentive reading telemetry, expressive avatar companions, and active recall flashcards.
colors:
  primary: "#6C5CE7"
  primary-hover: "#5B4FE1"
  primary-light: "#ECEAFF"
  primary-glow: "rgba(108, 92, 231, 0.28)"
  accent-purple: "#8E44AD"
  accent-cyan: "#00CEC9"
  accent-emerald: "#10B981"
  accent-emerald-light: "#ECFDF5"
  accent-amber: "#F59E0B"
  accent-amber-light: "#FFFBEB"
  accent-rose: "#F43F5E"
  accent-rose-light: "#FFF1F2"
  bg-app-dark: "#0F111A"
  bg-surface-dark: "#181B2A"
  bg-surface-elevated-dark: "#202438"
  bg-card-dark: "#1C2033"
  bg-card-hover-dark: "#242942"
  bg-app-light: "#F8F9FD"
  bg-surface-light: "#FFFFFF"
  bg-surface-elevated-light: "#F1F3F9"
  bg-card-light: "#FFFFFF"
  bg-card-hover-light: "#F5F6FC"
  border-subtle: "rgba(255, 255, 255, 0.08)"
  border-focus: "rgba(108, 92, 231, 0.6)"
  border-glass: "rgba(255, 255, 255, 0.12)"
  text-main-dark: "#F8FAFC"
  text-muted-dark: "#94A3B8"
  text-dim-dark: "#64748B"
  text-main-light: "#111827"
  text-muted-light: "#4B5563"
  text-dim-light: "#9CA3AF"
typography:
  font-family-display: "Poppins, sans-serif"
  font-family-sans: "Inter, system-ui, -apple-system, sans-serif"
  font-family-mono: "JetBrains Mono, monospace"
  h1:
    fontFamily: "{typography.font-family-display}"
    fontSize: "1.85rem"
    fontWeight: "800"
    lineHeight: "1.25"
  h2:
    fontFamily: "{typography.font-family-display}"
    fontSize: "1.35rem"
    fontWeight: "700"
    lineHeight: "1.3"
  h3:
    fontFamily: "{typography.font-family-display}"
    fontSize: "1.15rem"
    fontWeight: "600"
    lineHeight: "1.35"
  body-lg:
    fontFamily: "{typography.font-family-sans}"
    fontSize: "1.02rem"
    fontWeight: "400"
    lineHeight: "1.75"
  body-md:
    fontFamily: "{typography.font-family-sans}"
    fontSize: "0.92rem"
    fontWeight: "400"
    lineHeight: "1.5"
  body-sm:
    fontFamily: "{typography.font-family-sans}"
    fontSize: "0.82rem"
    fontWeight: "500"
    lineHeight: "1.4"
  code:
    fontFamily: "{typography.font-family-mono}"
    fontSize: "0.88rem"
    fontWeight: "500"
rounded:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
shadows:
  sm: "0 2px 8px rgba(0, 0, 0, 0.2)"
  md: "0 8px 24px rgba(0, 0, 0, 0.35)"
  lg: "0 16px 40px rgba(0, 0, 0, 0.45)"
  glow-primary: "0 0 25px rgba(108, 92, 231, 0.28)"
components:
  navbar-capsule:
    backgroundColor: "rgba(24, 27, 42, 0.85)"
    backdropFilter: "blur(16px)"
    border: "1px solid {colors.border-glass}"
    rounded: "{rounded.pill}"
    padding: "{spacing.sm} 18px"
    shadow: "{shadows.md}"
  btn-primary:
    background: "linear-gradient(135deg, {colors.primary}, {colors.primary-hover})"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "8px 20px"
    fontWeight: "600"
    shadow: "0 4px 14px {colors.primary-glow}"
  btn-secondary:
    backgroundColor: "{colors.bg-surface-elevated-dark}"
    textColor: "{colors.text-main-dark}"
    border: "1px solid {colors.border-subtle}"
    rounded: "{rounded.pill}"
    padding: "8px 18px"
    fontWeight: "600"
  reading-chunk:
    backgroundColor: "{colors.bg-surface-dark}"
    border: "1px solid {colors.border-subtle}"
    rounded: "{rounded.lg}"
    padding: "28px 32px"
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
  avatar-card:
    backgroundColor: "{colors.bg-surface-dark}"
    border: "1px solid {colors.border-subtle}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
    shadow: "{shadows.md}"
  checkpoint-popup:
    background: "linear-gradient(145deg, {colors.bg-surface-dark}, {colors.bg-card-dark})"
    border: "1px solid {colors.border-focus}"
    rounded: "{rounded.xl}"
    padding: "28px"
    shadow: "{shadows.lg}"
  flashcard-stage:
    perspective: "1000px"
    rounded: "{rounded.xl}"
    minHeight: "380px"
---

# Study Copilot Design System Specification

## 1. Overview & Identity
**Study Copilot** is designed specifically for computer science and engineering undergraduates grappling with dense, jargon-rich material (e.g., distributed consensus, memory paging, LSM storage engines). 

Its visual language fuses **Modern EdTech Approchability** (inspired by the friendly, high-trust aesthetic of My AI Tutor) with **Focused Technical Precision**. It replaces sterile, intimidating enterprise tools with a supportive reading companion that actively discourages zoning out, gently nudges when skimming occurs, and effortlessly converts reading notes into an Anki-compatible SuperMemo SM-2 deck.

---

## 2. Design Philosophy & Personality (The "Vibe")
1. **Attentive, Never Nagging**: The companion sits alongside the student with a calm, curious presence. Micro-animations are gentle and non-distracting until genuine skimming or idle zoning is detected.
2. **Claymorphic & Tactile**: Smooth rounded radii (`20px` to `28px`), soft ambient shadows, and pill capsules make interactive controls inviting.
3. **High-Contrast Dark Slate Default**: Minimizes eye strain during late-night study sessions while maintaining crisp, WCAG AAA text contrast (`#F8FAFC` on `#0F111A`).
4. **Seamless Transition between Reading & Recall**: The document view, checkpoint prompts, flashcard curation studio, and 3D study mode share identical typographic and token rhythms.

---

## 3. Color Tokens & Semantic Roles
- **Electric Indigo (`#6C5CE7`)**: The primary brand and action driver. Signifies intelligence, focus, and forward progression.
- **Cyan (`#00CEC9`)**: Used for secondary accents, code snippets, and active reading telemetry highlights.
- **Emerald (`#10B981`)**: Feedback color representing "Understood" section checkpoints, high recall retention, and attentive reading pace.
- **Amber (`#F59E0B`)**: Alert color triggering when rapid scrolling/skimming is detected before minimum dwell time is satisfied.
- **Rose (`#F43F5E`)**: Indicates cards due for immediate review, forgotten recall (`Again`), and break reminders.

---

## 4. Typography Hierarchy
- **Display Headlines (`Poppins`)**: Expressive, modern, geometric sans used for document titles, modal headers, and completion milestones.
- **Body & Reading Text (`Inter`)**: High-legibility humanist grotesque tuned for dense technical prose, lists, and question prompts. Line-height is strictly maintained at `1.75` for comfortable extended reading.
- **Technical Code & Telemetry (`JetBrains Mono`)**: Used for code blocks, acronyms, dwell timestamps, and numerical statistics.

---

## 5. Key Component Specifications

### A. Floating Capsule Navigation (`navbar-capsule`)
- Anchored to the top of the viewport with `backdrop-filter: blur(16px)` and `border-radius: 9999px`.
- Houses the zero-friction **Copilot ON/OFF toggle** with a live status dot, eliminating confirmation modal friction.

### B. The Study Copilot Avatar (`avatar-card`)
- Vector-rendered robot character wearing a graduation cap, positioned in a sticky sidebar.
- Animated states:
  - **Attentive**: Gentle breathing glow, curious emerald pupils tracking document progress.
  - **Skimming Alert**: Amber visor alert with subtle shake micro-animation and contextual check-in bubble.
  - **Idle / Zoning**: Drowsy purple pupils, drifting "Zzz" micro-indicators, and a gentle check-in prompt.
  - **Away**: Sleeping visor state when tab visibility is lost.

### C. Section Checkpoint Popup (`checkpoint-popup`)
- Placed directly at section boundaries to intercept passive skimming before moving forward.
- Interactive multiple-choice options with immediate color-coded correctness feedback.
- Seamlessly marks the response as a seeded flashcard in the repetition pipeline.

### D. 3D Flashcard Stage (`flashcard-stage`)
- Smooth `transform: rotateY(180deg)` flip animation with hardware acceleration.
- Front reveals question / cloze prompt `[...]`.
- Back reveals target answer, ease factor ($EF$), and contextual notes.
- SM-2 grading bar with keyboard shortcuts (`1`: Again, `2`: Hard, `3`: Good, `4`: Easy).

---

## 6. Micro-Interactions & Animation Rules
- **Scroll Dwell Meter**: A progressive bar inside each chunk card filling smoothly from `0%` to `100%` as the reader spends active time.
- **Card Flip**: 600ms cubic-bezier transition (`cubic-bezier(0.4, 0, 0.2, 1)`) ensuring fluid 3D depth without jank.
- **Celebratory Confetti**: Triggers dynamically upon completing the final card in a study deck.

---

## 7. Do's and Don'ts

### Do's:
- **Do** provide generous white space (`padding: 28px 32px`) inside reading chunk cards so technical diagrams and bullet points can breathe.
- **Do** keep the Copilot ON/OFF toggle instantly accessible at all times with zero confirmation dialogs.
- **Do** automatically back off nudge frequency when a student dismisses multiple prompts in a row.
- **Do** preserve section checkpoint Q&As directly into the flashcard deck without requiring re-entry.

### Don'ts:
- **Don't** use sharp, 90-degree squared borders; preserve the friendly, claymorphic curve radius (`14px`–`28px`).
- **Don't** nag with modals that lock the reading scroll; nudges should live comfortably in the companion sidebar.
- **Don't** use generic default system fonts; adhere strictly to Poppins, Inter, and JetBrains Mono.
