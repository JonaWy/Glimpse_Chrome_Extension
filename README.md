# Glimpse - Reading Enhancement Chrome Extension

A Chrome extension that enhances your reading experience with personalized features like reading time estimates, focus mode, and reading statistics.

![Glimpse Extension](docs/screenshot-placeholder.png)

## Features

### ✅ Implemented

- **Personal Reading Time Estimator** - Displays an estimated reading time badge on articles
  - Automatic article detection on popular platforms (Medium, Substack, WordPress, etc.)
  - Word count analysis with CJK character support
  - Personalized reading speed (default: 238 wpm)
  - Clean, non-intrusive badge UI with Candyland design

### 🚧 Coming Soon

- Focus Highlighter - Dim surrounding content while reading
- Scroll Progress Indicator - Visual reading progress bar
- Reading Statistics & Rewards - Track your reading habits
- Click to Define - Dictionary lookup without leaving the page

## Installation

### Development Setup

1. **Prerequisites**

   - Node.js 18+
   - npm or pnpm

2. **Clone and Install**

   ```bash
   git clone <repository-url>
   cd Glimpse
   npm install
   ```

3. **Build the Extension**

   ```bash
   # Development build (with watch mode)
   npm run dev

   # Production build
   npm run build
   ```

4. **Load in Chrome**

   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist/` folder from this project

5. **Create Icons**
   Before loading, create icon files in `dist/icons/`:

   - `icon-16.png` (16x16 pixels)
   - `icon-32.png` (32x32 pixels)
   - `icon-48.png` (48x48 pixels)
   - `icon-128.png` (128x128 pixels)

   Quick placeholder command (requires ImageMagick):

   ```bash
   mkdir -p dist/icons
   for size in 16 32 48 128; do
     convert -size ${size}x${size} xc:#F5A9B8 dist/icons/icon-${size}.png
   done
   ```

## Project Structure

```
Glimpse/
├── src/
│   ├── background/          # Service worker (background script)
│   │   └── service-worker.ts
│   ├── content/             # Content scripts injected into pages
│   │   └── content.ts
│   ├── popup/               # Extension popup UI
│   │   ├── popup.html
│   │   └── popup.ts
│   ├── styles/              # CSS stylesheets
│   │   ├── base.css         # Base design system
│   │   ├── content.css      # Injected page styles
│   │   └── popup.css        # Popup styles
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/               # Utility functions
│   │   ├── article-parser.ts
│   │   ├── messaging.ts
│   │   └── storage.ts
│   ├── icons/               # Extension icons
│   ├── _locales/            # i18n translations
│   │   ├── en/messages.json
│   │   └── de/messages.json
│   └── manifest.json        # Extension manifest (MV3)
├── docs/                    # Documentation
├── dist/                    # Build output (git-ignored)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## Tech Stack

- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Chrome Extension Manifest V3** - Latest extension standard

## Design System

This extension uses the **Candyland** design theme featuring:

- Soft pastels and vibrant accents
- Primary: Peachy pink (`oklch(0.8677 0.0735 7.0855)`)
- Secondary: Soft blue/lavender (`oklch(0.8148 0.0819 225.7537)`)
- Accent: Lime green (`oklch(0.9680 0.2110 109.7692)`)
- Font: Poppins (primary), Roboto Mono (code)
- Border radius: 0.5rem consistently

See `docs/candyland-design-style.md` for the complete style guide.

## Development

### Available Scripts

| Command              | Description              |
| -------------------- | ------------------------ |
| `npm run dev`        | Build with file watching |
| `npm run build`      | Production build         |
| `npm run lint`       | Run ESLint               |
| `npm run type-check` | TypeScript type checking |

### Testing the Extension

1. Build the extension: `npm run build`
2. Load in Chrome (see Installation)
3. Navigate to an article page (Medium, Substack, dev.to, etc.)
4. The reading time badge should appear in the top-right corner
5. Click the extension icon to see the popup with current page info

### Debugging

- **Popup**: Right-click extension icon → "Inspect popup"
- **Background**: `chrome://extensions/` → Click "Service worker" link
- **Content Script**: Open DevTools on any page → Console tab

## Architecture Decisions

### Manifest V3

Using Chrome's latest Manifest V3 standard:

- Service Worker instead of background page
- Declarative content scripts
- Stricter CSP

### Message Passing

Components communicate via `chrome.runtime.sendMessage`:

- Content Script ↔ Background: Article data, settings
- Popup ↔ Background: Statistics, profile updates

### Storage

Using `chrome.storage.local` for:

- User reading profile (speed, calibration)
- Reading statistics
- Feature settings

## Next Steps (for next developer)

The **next feature to implement** is the **Focus Highlighter**:

1. Read the feature spec in `docs/reading_extension_features.md`
2. Key implementation points:

   - Add paragraph click detection in content script
   - Create overlay element for dimming
   - Add focus icon next to selected paragraph
   - Implement keyboard navigation (arrow keys)
   - Add dimming intensity setting

3. Files to modify:
   - `src/content/content.ts` - Add focus mode logic
   - `src/styles/content.css` - Add overlay/focus styles
   - `src/popup/popup.ts` - Connect toggle

## License

MIT License - see LICENSE file for details.
