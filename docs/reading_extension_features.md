# Reading Enhancement Chrome Extension - Feature List

## Core Features

### 1. Personal Reading Time Estimator

**Description:** Displays an estimated reading time for articles and blog posts across popular platforms (Medium, Substack, personal blogs, news sites).

**Key Components:**

- Small, non-intrusive badge overlay (top-right or top-left corner)
- Personalized calibration system that learns each user's reading speed
- Benchmarking mode: user reads sample texts to establish baseline reading speed
- Per-website speed adjustments (some users read certain sites faster/slower)
- Word count detection algorithm
- Storage of user's reading metrics in Chrome local storage

**Supported Sites:**

- Medium
- Substack
- WordPress blogs
- Ghost blogs
- News websites (automatically detect article content)

---

### 2. Focus Highlighter

**Description:** Helps readers concentrate on specific paragraphs by dimming surrounding content, reducing visual distractions from sidebars, ads, and other elements.

**Key Components:**

- Click or hover to highlight a paragraph
- Everything except the selected paragraph dims (reduced opacity overlay)
- Focus icon appears next to highlighted text
- Click the focus icon to activate/deactivate dimming effect
- Smooth fade-in/fade-out transition for better UX
- Option to adjust dimming intensity in settings
- Works with keyboard shortcuts (optional: arrow keys to move between paragraphs)

**User Interaction:**

1. User clicks on a paragraph
2. Paragraph gets subtle highlight/border
3. Focus icon appears adjacent to the selected text
4. Click icon → page dims except selected paragraph
5. Click again or select new paragraph to exit focus mode

---

### 3. Scroll Progress Indicator

**Description:** Visual feedback showing reading progress through long articles with a thin colored line at the top of the page.

**Key Components:**

- Thin progress bar (2-3px height) fixed to top of viewport
- Smoothly fills from left to right as user scrolls
- Color customization in settings (default: gradient or solid color)
- Calculates progress based on article length (ignores headers, footers)
- Hides automatically on non-article pages
- Optional: shows percentage on hover

**Technical Details:**

- Detect article boundaries (main content area)
- Calculate scroll percentage relative to article end
- Update progress bar width dynamically

---

### 4. Reading Statistics & Rewards

**Description:** Gamification system that tracks and displays reading achievements to motivate consistent reading habits.

**Metrics Tracked:**

- Pages read (calculated from scroll completion)
- Words read (sum of article word counts)
- Articles completed
- Books equivalent (e.g., every 100,000 words = 1 book)
- Reading streaks (consecutive days)

**Time Periods:**

- Today
- This Week
- This Month
- This Year
- All Time

**Display Options:**

- Popup dashboard accessible from extension icon
- Optional: Small widget that can be toggled on/off
- Achievement badges (milestones: first 10 articles, 100k words, 30-day streak)
- Visual progress bars and statistics
- Export reading data functionality

**Motivation Elements:**

- Daily reading goals (user-defined)
- Streak counter with fire emoji or similar indicator
- Celebration animations for milestones
- Optional: weekly reading report summary

---

### 5. Click to Define (Dictionary Lookup)

**Description:** Instant word definitions without leaving the page, powered by a free dictionary API.

**Key Components:**

- Highlight any word on the page
- Dictionary icon appears next to selection
- Click icon → tiny popup appears with definition
- Popup includes:
  - Word pronunciation
  - Part of speech
  - Definition(s)
  - Example usage (if available)
- "X" close button on popup
- Click outside popup to dismiss
- Keyboard shortcut option (e.g., double-click + modifier key)

**API Integration:**

- Free Dictionary API (https://dictionaryapi.dev/)
- Fallback to secondary API if primary fails
- Cache definitions locally to reduce API calls
- Handle multiple definitions for same word

**User Experience:**

- Fast loading (<500ms)
- Clean, readable popup design
- Minimal visual footprint
- No disruption to reading flow

---

## Settings Panel

Users should be able to customize:

- Enable/disable individual features
- Reading speed calibration
- Progress bar color and visibility
- Focus mode dimming intensity
- Dictionary popup position preference
- Reading goals and notifications
- Data export/reset options

---
