/**
 * Glimpse Extension - Content Script
 * Self-contained script injected into web pages
 * NO EXTERNAL IMPORTS - everything is inline for Chrome Extension compatibility
 */

// Mark as module to avoid global scope conflicts
export {};

// ============================================
// TYPES (inline)
// ============================================

interface ArticleData {
  title: string;
  content: string;
  wordCount: number;
  estimatedReadingTime: number;
  url: string;
  siteName: string;
}

interface UserReadingProfile {
  wordsPerMinute: number;
  isCalibrated: boolean;
  lastCalibrationDate: number | null;
  siteSpeedAdjustments: Record<string, number>;
}

interface FeatureSettings {
  readingTimeEstimator: boolean;
  focusHighlighter: boolean;
  scrollProgressIndicator: boolean;
  readingStatistics: boolean;
  clickToDefine: boolean;
}

interface ExtensionSettings {
  features: FeatureSettings;
  readingTimePosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  progressBarColor: string;
  focusDimIntensity: number;
  dailyReadingGoalWords: number;
  theme: 'light' | 'dark' | 'system';
}

// ============================================
// DEFAULTS (inline)
// ============================================

const DEFAULT_PROFILE: UserReadingProfile = {
  wordsPerMinute: 238,
  isCalibrated: false,
  lastCalibrationDate: null,
  siteSpeedAdjustments: {},
};

const DEFAULT_SETTINGS: ExtensionSettings = {
  features: {
    readingTimeEstimator: true,
    focusHighlighter: true,
    scrollProgressIndicator: true,
    readingStatistics: true,
    clickToDefine: true,
  },
  readingTimePosition: 'top-right',
  progressBarColor: 'oklch(0.8677 0.0735 7.0855)',
  focusDimIntensity: 0.7,
  dailyReadingGoalWords: 5000,
  theme: 'system',
};

// ============================================
// ARTICLE PARSER (inline)
// ============================================

const ARTICLE_SELECTORS = [
  'article',
  '[role="article"]',
  'main article',
  '.post-content',
  '.article-content',
  '.entry-content',
  '.post-body',
  '.article-body',
  '.story-body',
  '.markdown-body',
  '.prose',
  '#article-body',
  '.crayons-article__main',
  '.post-full-content',
  '.gh-content',
  'main',
];

const EXCLUDE_SELECTORS = [
  'script', 'style', 'noscript', 'nav',
  'header:not(article header)', 'footer:not(article footer)',
  'aside', '.sidebar', '.comments', '.share-buttons',
  '.social-share', '.related-posts', '.advertisement', '.ad',
  '.author-bio', '.tags', '.navigation', '.menu',
];

const getTextContent = (element: HTMLElement): string => {
  const clone = element.cloneNode(true) as HTMLElement;
  EXCLUDE_SELECTORS.forEach((selector) => {
    try {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    } catch { /* skip invalid selectors */ }
  });
  return (clone.textContent || '').replace(/\s+/g, ' ').trim();
};

const countWords = (text: string): number => {
  if (!text || text.trim().length === 0) return 0;
  return text.split(/\s+/).filter((word) => word.length > 0).length;
};

const findArticleElement = (): HTMLElement | null => {
  for (const selector of ARTICLE_SELECTORS) {
    try {
      const element = document.querySelector<HTMLElement>(selector);
      if (element && countWords(getTextContent(element)) >= 100) {
        console.log(`[Glimpse] Found article with: ${selector}`);
        return element;
      }
    } catch { /* skip */ }
  }

  let best: HTMLElement | null = null;
  let maxWords = 0;

  document.querySelectorAll('div, section, main').forEach((el) => {
    const paragraphs = el.querySelectorAll('p');
    if (paragraphs.length < 2) return;
    
    let words = 0;
    paragraphs.forEach((p) => { words += countWords(p.textContent || ''); });
    
    if (words > maxWords && words >= 100) {
      maxWords = words;
      best = el as HTMLElement;
    }
  });

  return best;
};

const getArticleTitle = (): string => {
  const og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
  if (og?.content) return og.content;
  const h1 = document.querySelector('h1');
  if (h1?.textContent) return h1.textContent.trim();
  return document.title.split('|')[0].split('-')[0].trim();
};

const getSiteName = (): string => {
  const og = document.querySelector<HTMLMetaElement>('meta[property="og:site_name"]');
  if (og?.content) return og.content;
  return window.location.hostname.replace(/^www\./, '').split('.')[0];
};

const getCurrentHostname = (): string => {
  return window.location.hostname.replace(/^www\./, '');
};

const parseArticle = (wpm: number): ArticleData | null => {
  const articleEl = findArticleElement();
  
  if (articleEl) {
    const content = getTextContent(articleEl);
    const wordCount = countWords(content);
    if (wordCount >= 50) {
      const time = Math.max(1, Math.round(wordCount / wpm));
      return {
        title: getArticleTitle(),
        content,
        wordCount,
        estimatedReadingTime: time,
        url: window.location.href,
        siteName: getSiteName(),
      };
    }
  }

  const paragraphs = document.querySelectorAll('p');
  let totalWords = 0;
  const texts: string[] = [];
  
  paragraphs.forEach((p) => {
    const text = p.textContent || '';
    const words = countWords(text);
    if (words > 10) {
      totalWords += words;
      texts.push(text);
    }
  });

  if (totalWords >= 100) {
    const time = Math.max(1, Math.round(totalWords / wpm));
    return {
      title: getArticleTitle(),
      content: texts.join(' '),
      wordCount: totalWords,
      estimatedReadingTime: time,
      url: window.location.href,
      siteName: getSiteName(),
    };
  }

  return null;
};

// ============================================
// CONTENT SCRIPT STATE
// ============================================

interface ContentScriptState {
  profile: UserReadingProfile;
  settings: ExtensionSettings;
  articleData: ArticleData | null;
  badgeElement: HTMLElement | null;
  menuElement: HTMLElement | null;
  isInitialized: boolean;
  effectiveWPM: number;
  currentTheme: 'light' | 'dark';
  // Focus Highlighter state
  focusMode: {
    isActive: boolean;
    selectedParagraph: HTMLElement | null;
    overlay: HTMLElement | null;
    allParagraphs: HTMLElement[];
    currentIndex: number;
  };
}

const state: ContentScriptState = {
  profile: { ...DEFAULT_PROFILE },
  settings: { ...DEFAULT_SETTINGS },
  articleData: null,
  badgeElement: null,
  menuElement: null,
  isInitialized: false,
  effectiveWPM: 238,
  currentTheme: 'light',
  focusMode: {
    isActive: false,
    selectedParagraph: null,
    overlay: null,
    allParagraphs: [],
    currentIndex: -1,
  },
};

// ============================================
// THEME MANAGEMENT
// ============================================

const getSystemTheme = (): 'light' | 'dark' => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyThemeToElement = (element: HTMLElement | null): void => {
  if (!element) return;
  element.classList.remove('glimpse-theme-light', 'glimpse-theme-dark');
  element.classList.add(`glimpse-theme-${state.currentTheme}`);
};

const applyThemeToAllElements = (): void => {
  applyThemeToElement(state.badgeElement);
  applyThemeToElement(state.menuElement);
  applyThemeToElement(state.focusMode.overlay);
  applyThemeToElement(focusHintElement);
};

const initTheme = async (): Promise<void> => {
  try {
    const result = await chrome.storage.local.get(['theme']);
    const savedTheme = result.theme ?? 'system';
    state.currentTheme = savedTheme === 'system' ? getSystemTheme() : savedTheme;
  } catch (e) {
    console.log('[Glimpse] Using system theme as fallback');
    state.currentTheme = getSystemTheme();
  }
  
  applyThemeToAllElements();
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    try {
      const result = await chrome.storage.local.get(['theme']);
      const savedTheme = result.theme ?? 'system';
      if (savedTheme === 'system') {
        state.currentTheme = getSystemTheme();
        applyThemeToAllElements();
      }
    } catch {
      // Ignore
    }
  });
  
  // Listen for theme changes from storage
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.theme) {
      const newTheme = changes.theme.newValue ?? 'system';
      state.currentTheme = newTheme === 'system' ? getSystemTheme() : newTheme;
      applyThemeToAllElements();
      console.log('[Glimpse] Theme changed to:', state.currentTheme);
    }
  });
};

// ============================================
// SPEED ADJUSTMENT MENU
// ============================================

const createSpeedMenu = (): HTMLElement => {
  const menu = document.createElement('div');
  menu.className = `glimpse-extension glimpse-speed-menu glimpse-theme-${state.currentTheme}`;
  
  const hostname = getCurrentHostname();
  const siteAdjustment = state.profile.siteSpeedAdjustments[hostname] || 0;
  const currentWPM = state.effectiveWPM;
  
  menu.innerHTML = `
    <div class="glimpse-menu-header">
      <span>Adjust for ${hostname}</span>
      <button class="glimpse-menu-close" type="button">×</button>
    </div>
    <div class="glimpse-menu-content">
      <div class="glimpse-speed-display">
        <span class="glimpse-speed-value">${currentWPM}</span>
        <span class="glimpse-speed-unit">wpm</span>
      </div>
      <div class="glimpse-speed-slider-container">
        <button class="glimpse-speed-btn" data-delta="-50">−50</button>
        <input type="range" class="glimpse-speed-slider" 
               min="-100" max="100" value="${siteAdjustment}" step="10">
        <button class="glimpse-speed-btn" data-delta="50">+50</button>
      </div>
      <div class="glimpse-speed-adjustment">
        Adjustment: <span class="glimpse-adjustment-value">${siteAdjustment >= 0 ? '+' : ''}${siteAdjustment}</span>
      </div>
      <div class="glimpse-menu-actions">
        <button class="glimpse-save-btn">Save for this site</button>
        <button class="glimpse-reset-btn">Reset</button>
      </div>
    </div>
  `;

  // Event handlers
  const closeBtn = menu.querySelector('.glimpse-menu-close');
  const slider = menu.querySelector('.glimpse-speed-slider') as HTMLInputElement;
  const speedBtns = menu.querySelectorAll('.glimpse-speed-btn');
  const saveBtn = menu.querySelector('.glimpse-save-btn');
  const resetBtn = menu.querySelector('.glimpse-reset-btn');

  closeBtn?.addEventListener('click', () => hideSpeedMenu());

  slider?.addEventListener('input', () => {
    const adjustment = parseInt(slider.value);
    updateSpeedPreview(adjustment);
  });

  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = parseInt((btn as HTMLElement).dataset.delta || '0');
      const current = parseInt(slider?.value || '0');
      const newValue = Math.max(-100, Math.min(100, current + delta));
      if (slider) slider.value = String(newValue);
      updateSpeedPreview(newValue);
    });
  });

  saveBtn?.addEventListener('click', async () => {
    const adjustment = parseInt(slider?.value || '0');
    await saveSiteAdjustment(hostname, adjustment);
    hideSpeedMenu();
  });

  resetBtn?.addEventListener('click', async () => {
    if (slider) slider.value = '0';
    updateSpeedPreview(0);
    await saveSiteAdjustment(hostname, 0);
    hideSpeedMenu();
  });

  return menu;
};

const updateSpeedPreview = (adjustment: number): void => {
  const baseWPM = state.profile.wordsPerMinute;
  const previewWPM = Math.max(50, baseWPM + adjustment);
  
  // Update menu display
  const speedValue = state.menuElement?.querySelector('.glimpse-speed-value');
  const adjustmentValue = state.menuElement?.querySelector('.glimpse-adjustment-value');
  
  if (speedValue) speedValue.textContent = String(previewWPM);
  if (adjustmentValue) {
    adjustmentValue.textContent = adjustment >= 0 ? `+${adjustment}` : String(adjustment);
  }
  
  // Update badge preview
  if (state.articleData) {
    const previewTime = Math.max(1, Math.round(state.articleData.wordCount / previewWPM));
    const timeEl = state.badgeElement?.querySelector('.glimpse-badge-time');
    if (timeEl) {
      timeEl.textContent = previewTime < 1 ? '< 1 min' : `${previewTime} min`;
    }
  }
};

const saveSiteAdjustment = async (hostname: string, adjustment: number): Promise<void> => {
  const newAdjustments = { ...state.profile.siteSpeedAdjustments };
  
  if (adjustment === 0) {
    delete newAdjustments[hostname];
  } else {
    newAdjustments[hostname] = adjustment;
  }
  
  state.profile.siteSpeedAdjustments = newAdjustments;
  state.effectiveWPM = Math.max(50, state.profile.wordsPerMinute + adjustment);
  
  // Save to storage
  try {
    await sendMessage('UPDATE_PROFILE', { siteSpeedAdjustments: newAdjustments });
    console.log(`[Glimpse] Saved adjustment for ${hostname}: ${adjustment}`);
    
    // Recalculate reading time
    if (state.articleData) {
      state.articleData.estimatedReadingTime = Math.max(1, 
        Math.round(state.articleData.wordCount / state.effectiveWPM));
      updateBadge(state.articleData);
    }
  } catch (e) {
    console.error('[Glimpse] Failed to save adjustment:', e);
  }
};

const showSpeedMenu = (): void => {
  if (state.menuElement) {
    state.menuElement.classList.add('visible');
    return;
  }
  
  state.menuElement = createSpeedMenu();
  document.body.appendChild(state.menuElement);
  
  requestAnimationFrame(() => {
    state.menuElement?.classList.add('visible');
  });
};

const hideSpeedMenu = (): void => {
  state.menuElement?.classList.remove('visible');
};

// ============================================
// BADGE UI
// ============================================

const createBadgeElement = (): HTMLElement => {
  const badge = document.createElement('div');
  badge.className = `glimpse-extension glimpse-reading-time-badge glimpse-theme-${state.currentTheme}`;
  
  const isCalibrated = state.profile.isCalibrated;
  const hostname = getCurrentHostname();
  const hasAdjustment = hostname in state.profile.siteSpeedAdjustments;
  
  badge.innerHTML = `
    <div class="glimpse-badge-icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
    </div>
    <div class="glimpse-badge-content">
      <div class="glimpse-badge-time">-- min</div>
      <div class="glimpse-badge-words">-- words</div>
    </div>
    <div class="glimpse-badge-actions">
      <button class="glimpse-badge-adjust" type="button" title="Adjust reading speed for this site">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6m-5.5-9H1m6 0h6m0 0h6m-6-5.5V1m0 6v6m0 6v5"></path>
        </svg>
      </button>
      <button class="glimpse-badge-close" type="button" title="Hide badge">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    ${!isCalibrated ? `
      <div class="glimpse-badge-hint">
        <span>Estimate</span>
      </div>
    ` : ''}
    ${hasAdjustment ? `
      <div class="glimpse-badge-adjusted">
        <span>Adjusted</span>
      </div>
    ` : ''}
  `;

  // Event handlers
  badge.querySelector('.glimpse-badge-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    badge.classList.remove('visible');
  });

  badge.querySelector('.glimpse-badge-adjust')?.addEventListener('click', (e) => {
    e.stopPropagation();
    showSpeedMenu();
  });

  return badge;
};

const updateBadge = (data: ArticleData): void => {
  if (!state.badgeElement) return;
  
  const timeEl = state.badgeElement.querySelector('.glimpse-badge-time');
  const wordsEl = state.badgeElement.querySelector('.glimpse-badge-words');
  
  if (timeEl) {
    timeEl.textContent = data.estimatedReadingTime < 1 
      ? '< 1 min' 
      : `${data.estimatedReadingTime} min`;
  }
  if (wordsEl) {
    wordsEl.textContent = `${data.wordCount.toLocaleString()} words`;
  }
};

const showBadge = (): void => {
  if (!state.badgeElement) return;
  
  const pos = state.settings.readingTimePosition;
  state.badgeElement.className = 'glimpse-extension glimpse-reading-time-badge';
  state.badgeElement.classList.add(`position-${pos}`);
  
  requestAnimationFrame(() => {
    state.badgeElement?.classList.add('visible');
  });
};

// ============================================
// MESSAGING
// ============================================

const sendMessage = <T>(type: string, payload?: unknown): Promise<T> => {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ type, payload }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response as T);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_ARTICLE_DATA') {
    sendResponse(state.articleData);
    return false;
  }
  if (message.type === 'PROFILE_UPDATED') {
    // Re-fetch profile when it changes
    sendMessage<UserReadingProfile>('GET_PROFILE').then(profile => {
      if (profile) {
        state.profile = profile;
        recalculateReadingTime();
      }
    });
    return false;
  }
  if (message.type === 'SETTINGS_UPDATED') {
    // Re-fetch settings when they change
    sendMessage<ExtensionSettings>('GET_SETTINGS').then(settings => {
      if (settings) {
        const previousFocusEnabled = state.settings.features.focusHighlighter;
        state.settings = settings;
        
        // Update dim intensity if focus mode is active
        if (state.focusMode.overlay && state.focusMode.isActive) {
          state.focusMode.overlay.style.setProperty(
            '--glimpse-dim-intensity', 
            String(settings.focusDimIntensity)
          );
        }
        
        // Handle focus highlighter being toggled
        if (settings.features.focusHighlighter && !previousFocusEnabled) {
          // Feature was enabled, initialize it
          initFocusHighlighter();
        } else if (!settings.features.focusHighlighter && previousFocusEnabled) {
          // Feature was disabled, clean up
          cleanupFocusHighlighter();
        }
      }
    });
    return false;
  }
  return false;
});

// ============================================
// RECALCULATION
// ============================================

const recalculateReadingTime = (): void => {
  if (!state.articleData) return;
  
  const hostname = getCurrentHostname();
  const adjustment = state.profile.siteSpeedAdjustments[hostname] || 0;
  state.effectiveWPM = Math.max(50, state.profile.wordsPerMinute + adjustment);
  
  state.articleData.estimatedReadingTime = Math.max(1, 
    Math.round(state.articleData.wordCount / state.effectiveWPM));
  
  updateBadge(state.articleData);
};

// ============================================
// FOCUS HIGHLIGHTER
// ============================================

/**
 * Get all readable text blocks from the page (paragraphs, headlines, and list items)
 */
const getReadableParagraphs = (): HTMLElement[] => {
  const elements: HTMLElement[] = [];
  
  // Include paragraphs, all headline levels, and list items
  const selectors = [
    'p',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'li',
    'article p', 'article h1', 'article h2', 'article h3', 'article h4', 'article h5', 'article h6', 'article li',
    '.post-content p', '.post-content h1', '.post-content h2', '.post-content h3', '.post-content h4', '.post-content li',
    '.article-content p', '.article-content h1', '.article-content h2', '.article-content h3', '.article-content h4', '.article-content li',
    '.entry-content p', '.entry-content h1', '.entry-content h2', '.entry-content h3', '.entry-content h4', '.entry-content li'
  ];
  
  const candidates = document.querySelectorAll(selectors.join(', '));
  const seen = new Set<HTMLElement>(); // Avoid duplicates
  
  candidates.forEach((el) => {
    const element = el as HTMLElement;
    
    // Skip if already processed
    if (seen.has(element)) return;
    seen.add(element);
    
    // Skip nested list items (li inside li) - only get the innermost
    if (element.tagName.toLowerCase() === 'li' && element.querySelector('li')) {
      return;
    }
    
    const text = element.textContent || '';
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const tagName = element.tagName.toLowerCase();
    
    // Different minimum word counts for different element types
    const isHeadline = tagName.startsWith('h') && tagName.length === 2;
    const isListItem = tagName === 'li';
    const minWords = isHeadline ? 1 : (isListItem ? 2 : 3);
    
    if (wordCount >= minWords && element.offsetParent !== null) {
      elements.push(element);
    }
  });
  
  // Sort elements by their position in the document
  elements.sort((a, b) => {
    const position = a.compareDocumentPosition(b);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
  
  return elements;
};

/**
 * Create the dimming overlay (4 parts surrounding the paragraph)
 */
const createFocusOverlay = (): HTMLElement => {
  const container = document.createElement('div');
  container.className = `glimpse-extension glimpse-focus-overlay-container glimpse-theme-${state.currentTheme}`;
  container.style.setProperty('--glimpse-dim-intensity', String(state.settings.focusDimIntensity));
  
  // Create 4 overlay parts: top, bottom, left, right
  ['top', 'bottom', 'left', 'right'].forEach(position => {
    const part = document.createElement('div');
    part.className = `glimpse-focus-overlay glimpse-focus-overlay-${position}`;
    container.appendChild(part);
  });
  
  container.addEventListener('click', (e) => {
    // Exit focus mode when clicking any overlay part
    if ((e.target as HTMLElement).classList.contains('glimpse-focus-overlay')) {
      exitFocusMode();
    }
  });
  
  return container;
};

/**
 * Continuously update overlay position during scroll animation
 */
const trackScrollAnimation = (): void => {
  if (!state.focusMode.selectedParagraph || !state.focusMode.isActive) return;
  
  let lastTop = -1;
  let stableFrames = 0;
  const maxStableFrames = 5; // Consider animation done after 5 stable frames
  
  const updateLoop = () => {
    if (!state.focusMode.selectedParagraph || !state.focusMode.isActive) return;
    
    const rect = state.focusMode.selectedParagraph.getBoundingClientRect();
    
    // Update overlay position
    positionOverlayParts();
    
    // Check if position has stabilized
    if (Math.abs(rect.top - lastTop) < 1) {
      stableFrames++;
      if (stableFrames >= maxStableFrames) {
        // Animation complete, final position update
        positionOverlayParts();
        return;
      }
    } else {
      stableFrames = 0;
    }
    
    lastTop = rect.top;
    requestAnimationFrame(updateLoop);
  };
  
  requestAnimationFrame(updateLoop);
};

/**
 * Select a paragraph and immediately enter focus mode
 */
const selectParagraph = (paragraph: HTMLElement): void => {
  // Remove previous selection
  if (state.focusMode.selectedParagraph) {
    state.focusMode.selectedParagraph.classList.remove('glimpse-paragraph-selected');
    state.focusMode.selectedParagraph.classList.remove('glimpse-paragraph-focused');
  }
  
  // Update state
  state.focusMode.selectedParagraph = paragraph;
  state.focusMode.currentIndex = state.focusMode.allParagraphs.indexOf(paragraph);
  
  // Add selection class
  paragraph.classList.add('glimpse-paragraph-selected');
  
  // Check if scrolling is needed
  const rect = paragraph.getBoundingClientRect();
  const needsScroll = rect.top < 100 || rect.bottom > window.innerHeight - 100;
  
  // Enter focus mode first
  enterFocusMode();
  
  // Then scroll if needed - the overlay will track the animation
  if (needsScroll) {
    paragraph.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Start tracking the scroll animation to keep overlay in sync
    trackScrollAnimation();
  }
};

/**
 * Position the overlay parts around the paragraph
 */
const positionOverlayParts = (): void => {
  if (!state.focusMode.overlay || !state.focusMode.selectedParagraph) return;
  
  const rect = state.focusMode.selectedParagraph.getBoundingClientRect();
  const padding = 8; // Padding around the paragraph
  
  const top = state.focusMode.overlay.querySelector('.glimpse-focus-overlay-top') as HTMLElement;
  const bottom = state.focusMode.overlay.querySelector('.glimpse-focus-overlay-bottom') as HTMLElement;
  const left = state.focusMode.overlay.querySelector('.glimpse-focus-overlay-left') as HTMLElement;
  const right = state.focusMode.overlay.querySelector('.glimpse-focus-overlay-right') as HTMLElement;
  
  if (top) {
    top.style.top = '0';
    top.style.left = '0';
    top.style.right = '0';
    top.style.height = `${Math.max(0, rect.top - padding)}px`;
  }
  
  if (bottom) {
    bottom.style.top = `${rect.bottom + padding}px`;
    bottom.style.left = '0';
    bottom.style.right = '0';
    bottom.style.bottom = '0';
  }
  
  if (left) {
    left.style.top = `${Math.max(0, rect.top - padding)}px`;
    left.style.left = '0';
    left.style.width = `${Math.max(0, rect.left - padding)}px`;
    left.style.height = `${rect.height + padding * 2}px`;
  }
  
  if (right) {
    right.style.top = `${Math.max(0, rect.top - padding)}px`;
    right.style.left = `${rect.right + padding}px`;
    right.style.right = '0';
    right.style.height = `${rect.height + padding * 2}px`;
  }
};

/**
 * Enter focus mode - dim everything except selected paragraph
 */
const enterFocusMode = (): void => {
  if (!state.focusMode.selectedParagraph) return;
  
  state.focusMode.isActive = true;
  
  // Create and show overlay
  if (!state.focusMode.overlay) {
    state.focusMode.overlay = createFocusOverlay();
    document.body.appendChild(state.focusMode.overlay);
  }
  
  // Update dim intensity from settings
  state.focusMode.overlay.style.setProperty('--glimpse-dim-intensity', String(state.settings.focusDimIntensity));
  
  // Position overlay parts around the paragraph
  positionOverlayParts();
  
  // Add focused class to selected paragraph
  state.focusMode.selectedParagraph.classList.add('glimpse-paragraph-focused');
  
  // Activate overlay
  requestAnimationFrame(() => {
    state.focusMode.overlay?.classList.add('active');
  });
  
  // Add keyboard hint
  showFocusHint();
};

/**
 * Exit focus mode and clear selection
 */
const exitFocusMode = (): void => {
  state.focusMode.isActive = false;
  
  // Remove focused and selected classes
  if (state.focusMode.selectedParagraph) {
    state.focusMode.selectedParagraph.classList.remove('glimpse-paragraph-focused');
    state.focusMode.selectedParagraph.classList.remove('glimpse-paragraph-selected');
    state.focusMode.selectedParagraph = null;
  }
  
  // Reset index
  state.focusMode.currentIndex = -1;
  
  // Hide overlay
  state.focusMode.overlay?.classList.remove('active');
  
  // Hide hint
  hideFocusHint();
};

/**
 * Navigate to next/previous paragraph while in focus mode
 */
const navigateParagraph = (direction: 'next' | 'prev'): void => {
  if (state.focusMode.allParagraphs.length === 0) return;
  if (state.focusMode.currentIndex === -1) return;
  
  const newIndex = direction === 'next' 
    ? state.focusMode.currentIndex + 1 
    : state.focusMode.currentIndex - 1;
  
  // Clamp to valid range
  if (newIndex < 0 || newIndex >= state.focusMode.allParagraphs.length) {
    return; // At boundary, don't wrap
  }
  
  // Remove classes from current paragraph
  if (state.focusMode.selectedParagraph) {
    state.focusMode.selectedParagraph.classList.remove('glimpse-paragraph-focused');
    state.focusMode.selectedParagraph.classList.remove('glimpse-paragraph-selected');
  }
  
  // Update state
  const newParagraph = state.focusMode.allParagraphs[newIndex];
  state.focusMode.selectedParagraph = newParagraph;
  state.focusMode.currentIndex = newIndex;
  
  // Add classes to new paragraph
  newParagraph.classList.add('glimpse-paragraph-selected');
  newParagraph.classList.add('glimpse-paragraph-focused');
  
  // Check if scrolling is needed
  const rect = newParagraph.getBoundingClientRect();
  const needsScroll = rect.top < 100 || rect.bottom > window.innerHeight - 100;
  
  // Position overlay first
  positionOverlayParts();
  
  // Then scroll if needed - track animation to keep overlay in sync
  if (needsScroll) {
    newParagraph.scrollIntoView({ behavior: 'smooth', block: 'center' });
    trackScrollAnimation();
  }
};

/**
 * Show keyboard navigation hint
 */
let focusHintElement: HTMLElement | null = null;

const showFocusHint = (): void => {
  if (focusHintElement) return;
  
  focusHintElement = document.createElement('div');
  focusHintElement.className = `glimpse-extension glimpse-focus-hint glimpse-theme-${state.currentTheme}`;
  focusHintElement.innerHTML = `
    <span>↑↓ Navigate</span>
    <span>Esc Exit</span>
  `;
  document.body.appendChild(focusHintElement);
  
  requestAnimationFrame(() => {
    focusHintElement?.classList.add('visible');
  });
};

const hideFocusHint = (): void => {
  focusHintElement?.classList.remove('visible');
  setTimeout(() => {
    focusHintElement?.remove();
    focusHintElement = null;
  }, 200);
};

/**
 * Handle paragraph/headline click
 */
const handleParagraphClick = (e: MouseEvent): void => {
  const target = e.target as HTMLElement;
  
  // Find the paragraph, headline, or list item element
  const paragraph = target.closest('p, h1, h2, h3, h4, h5, h6, li') as HTMLElement | null;
  
  if (!paragraph) return;
  
  // Check if this element is in our list
  if (!state.focusMode.allParagraphs.includes(paragraph)) return;
  
  // Don't handle if clicking on links or other interactive elements
  if ((target as HTMLElement).closest('a, button, input, textarea, select')) return;
  
  e.stopPropagation();
  
  // If clicking the same paragraph while in focus mode, exit
  if (state.focusMode.isActive && state.focusMode.selectedParagraph === paragraph) {
    exitFocusMode();
    return;
  }
  
  // Select this paragraph
  selectParagraph(paragraph);
};

/**
 * Handle keyboard navigation
 */
const handleFocusKeydown = (e: KeyboardEvent): void => {
  // Only handle if focus feature is enabled and focus mode is active
  if (!state.settings.features.focusHighlighter) return;
  if (!state.focusMode.isActive) return;
  
  switch (e.key) {
    case 'ArrowUp':
    case 'ArrowLeft':
      e.preventDefault();
      navigateParagraph('prev');
      break;
      
    case 'ArrowDown':
    case 'ArrowRight':
      e.preventDefault();
      navigateParagraph('next');
      break;
      
    case 'Escape':
      e.preventDefault();
      exitFocusMode();
      break;
  }
};

/**
 * Cleanup focus highlighter (when disabled)
 */
const cleanupFocusHighlighter = (): void => {
  console.log('[Glimpse] Cleaning up focus highlighter');
  
  // Exit focus mode if active
  exitFocusMode();
  
  // Remove classes from paragraphs
  state.focusMode.allParagraphs.forEach((p) => {
    p.classList.remove('glimpse-paragraph-selectable');
    p.removeEventListener('click', handleParagraphClick);
  });
  
  // Remove overlay element
  state.focusMode.overlay?.remove();
  state.focusMode.overlay = null;
  
  focusHintElement?.remove();
  focusHintElement = null;
  
  // Reset state
  state.focusMode.allParagraphs = [];
  state.focusMode.currentIndex = -1;
  
  // Remove keyboard listener
  document.removeEventListener('keydown', handleFocusKeydown);
};

/**
 * Initialize focus highlighter feature
 */
const initFocusHighlighter = (): void => {
  if (!state.settings.features.focusHighlighter) {
    console.log('[Glimpse] Focus highlighter is disabled');
    return;
  }
  
  // Get all readable paragraphs
  state.focusMode.allParagraphs = getReadableParagraphs();
  
  if (state.focusMode.allParagraphs.length === 0) {
    console.log('[Glimpse] No paragraphs found for focus mode');
    return;
  }
  
  console.log(`[Glimpse] Focus highlighter: ${state.focusMode.allParagraphs.length} paragraphs found`);
  
  // Add click listeners to paragraphs
  state.focusMode.allParagraphs.forEach((p) => {
    p.classList.add('glimpse-paragraph-selectable');
    p.addEventListener('click', handleParagraphClick);
  });
  
  // Add keyboard listener
  document.addEventListener('keydown', handleFocusKeydown);
  
  // Update overlay position on scroll/resize
  let rafId: number | null = null;
  const handleScroll = () => {
    // Use requestAnimationFrame for smooth updates during scroll
    if (rafId !== null) return;
    
    rafId = requestAnimationFrame(() => {
      rafId = null;
      
      // Update overlay position if focus mode is active
      if (state.focusMode.isActive && state.focusMode.overlay) {
        positionOverlayParts();
      }
    });
  };
  
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll, { passive: true });
};

// ============================================
// INITIALIZATION
// ============================================

const initReadingTimeFeature = async (): Promise<void> => {
  console.log('[Glimpse] Starting initialization...');

  // Initialize theme first
  await initTheme();

  // Try to get settings from background
  try {
    const profile = await sendMessage<UserReadingProfile>('GET_PROFILE');
    const settings = await sendMessage<ExtensionSettings>('GET_SETTINGS');
    if (profile) state.profile = profile;
    if (settings) state.settings = settings;
    console.log('[Glimpse] Loaded settings from storage');
  } catch (e) {
    console.log('[Glimpse] Using default settings');
  }

  // Check if feature is enabled
  if (!state.settings.features.readingTimeEstimator) {
    console.log('[Glimpse] Reading time feature is disabled');
    return;
  }

  // Calculate effective WPM with site adjustment
  const hostname = getCurrentHostname();
  const siteAdjustment = state.profile.siteSpeedAdjustments[hostname] || 0;
  state.effectiveWPM = Math.max(50, state.profile.wordsPerMinute + siteAdjustment);
  
  console.log(`[Glimpse] Base WPM: ${state.profile.wordsPerMinute}, Site adjustment: ${siteAdjustment}, Effective: ${state.effectiveWPM}`);

  // Parse article with effective WPM
  state.articleData = parseArticle(state.effectiveWPM);

  if (!state.articleData) {
    console.log('[Glimpse] No article found on this page');
    // Still initialize focus highlighter even without article detection
    initFocusHighlighter();
    return;
  }

  console.log('[Glimpse] Article found:', {
    title: state.articleData.title,
    words: state.articleData.wordCount,
    time: state.articleData.estimatedReadingTime,
  });

  // Create and show badge
  state.badgeElement = createBadgeElement();
  document.body.appendChild(state.badgeElement);
  updateBadge(state.articleData);
  
  setTimeout(() => {
    showBadge();
    console.log('[Glimpse] Badge visible!');
  }, 300);

  // Notify background
  sendMessage('ARTICLE_DATA_RESPONSE', state.articleData).catch(() => {});
  
  // Initialize Focus Highlighter
  initFocusHighlighter();
};

const init = (): void => {
  if (state.isInitialized) return;
  state.isInitialized = true;

  console.log('[Glimpse] Content script loaded:', window.location.href);

  const start = () => {
    setTimeout(initReadingTimeFeature, 500);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
};

// Start
init();
