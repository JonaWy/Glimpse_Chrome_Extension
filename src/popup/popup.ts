/**
 * Glimpse Extension - Popup Script
 * Self-contained - NO EXTERNAL IMPORTS
 */

// Mark as module to avoid global scope conflicts
export {};

// ============================================
// TYPES
// ============================================

interface ArticleData {
  title: string;
  wordCount: number;
  estimatedReadingTime: number;
}

interface UserReadingProfile {
  wordsPerMinute: number;
  isCalibrated: boolean;
}

interface ReadingStatistics {
  currentStreak: number;
  dailyStats: Record<string, { wordsRead: number; articlesCompleted: number; timeSpentSeconds: number }>;
}

interface FeatureSettings {
  readingTimeEstimator: boolean;
  focusHighlighter: boolean;
  scrollProgressIndicator: boolean;
}

interface ExtensionSettings {
  features: FeatureSettings;
  theme?: 'light' | 'dark' | 'system';
}

// ============================================
// MESSAGING
// ============================================

const sendMessage = <T>(type: string, payload?: unknown): Promise<T> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response as T);
      }
    });
  });
};

const sendToActiveTab = async <T>(type: string): Promise<T | null> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;
  
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id!, { type }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(response as T);
      }
    });
  });
};

// ============================================
// STATE
// ============================================

let profile: UserReadingProfile | null = null;
let settings: ExtensionSettings | null = null;
let statistics: ReadingStatistics | null = null;
let articleData: ArticleData | null = null;

// ============================================
// UI HELPERS
// ============================================

const $ = (id: string) => document.getElementById(id);

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
};

// ============================================
// UI UPDATES
// ============================================

const updateCurrentPage = () => {
  const info = $('current-page-info');
  const empty = $('current-page-empty');
  const time = $('current-time');
  const words = $('current-words');

  if (articleData) {
    if (info) info.style.display = 'flex';
    if (empty) empty.style.display = 'none';
    if (time) time.textContent = articleData.estimatedReadingTime < 1 
      ? '< 1 min' 
      : `${articleData.estimatedReadingTime} min`;
    if (words) words.textContent = `${articleData.wordCount.toLocaleString()} words`;
  } else {
    if (info) info.style.display = 'none';
    if (empty) empty.style.display = 'block';
  }
};

const updateReadingSpeed = () => {
  const wpmEl = $('wpm-value');
  const statusEl = $('calibration-status');
  const textEl = $('calibration-text');

  if (wpmEl) wpmEl.textContent = String(profile?.wordsPerMinute ?? 238);
  
  if (statusEl && textEl) {
    if (profile?.isCalibrated) {
      statusEl.classList.remove('not-calibrated');
      statusEl.classList.add('calibrated');
      textEl.textContent = 'Personalized';
    } else {
      statusEl.classList.remove('calibrated');
      statusEl.classList.add('not-calibrated');
      textEl.textContent = 'Estimate';
    }
  }
};

const updateStats = () => {
  const today = new Date().toISOString().split('T')[0];
  const todayStats = statistics?.dailyStats[today];

  const articles = $('stat-articles');
  const words = $('stat-words');
  const streak = $('stat-streak');

  if (articles) articles.textContent = String(todayStats?.articlesCompleted ?? 0);
  if (words) words.textContent = formatNumber(todayStats?.wordsRead ?? 0);
  if (streak) streak.textContent = String(statistics?.currentStreak ?? 0);
};

const updateToggles = () => {
  const features = settings?.features;
  
  const updateToggle = (id: string, active: boolean) => {
    const el = $(id);
    if (el) {
      el.classList.toggle('active', active);
      el.setAttribute('aria-checked', String(active));
    }
  };

  updateToggle('toggle-reading-time', features?.readingTimeEstimator ?? true);
  updateToggle('toggle-focus', features?.focusHighlighter ?? true);
  updateToggle('toggle-progress', features?.scrollProgressIndicator ?? true);
};

// ============================================
// THEME MANAGEMENT
// ============================================

type Theme = 'light' | 'dark' | 'system';

const getSystemTheme = (): 'light' | 'dark' => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
  
  root.classList.remove('light', 'dark');
  root.classList.add(effectiveTheme);
  
  // Update button icon visibility
  const themeBtn = $('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.setAttribute('data-theme', effectiveTheme);
  }
};

const toggleTheme = async () => {
  const currentTheme = settings?.theme ?? 'system';
  const effectiveTheme = currentTheme === 'system' ? getSystemTheme() : currentTheme;
  const newTheme: Theme = effectiveTheme === 'dark' ? 'light' : 'dark';
  
  applyTheme(newTheme);
  
  // Save to storage
  try {
    await chrome.storage.local.set({ theme: newTheme });
    if (settings) {
      settings.theme = newTheme;
    }
  } catch (e) {
    console.error('[Glimpse Popup] Error saving theme:', e);
  }
};

const initTheme = async () => {
  // Load saved theme from storage
  try {
    const result = await chrome.storage.local.get(['theme']);
    const savedTheme: Theme = result.theme ?? 'system';
    applyTheme(savedTheme);
    if (settings) {
      settings.theme = savedTheme;
    }
  } catch (e) {
    console.error('[Glimpse Popup] Error loading theme:', e);
    applyTheme('system');
  }
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentTheme = settings?.theme ?? 'system';
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  });
};

// ============================================
// EVENT HANDLERS
// ============================================

const handleToggle = async (toggleId: string, featureKey: keyof FeatureSettings) => {
  const el = $(toggleId);
  if (!el || !settings) return;

  const isActive = el.classList.contains('active');
  const newValue = !isActive;

  el.classList.toggle('active', newValue);
  el.setAttribute('aria-checked', String(newValue));

  const updatedFeatures = { ...settings.features, [featureKey]: newValue };
  
  try {
    await sendMessage('UPDATE_SETTINGS', { features: updatedFeatures });
    settings.features = updatedFeatures;
  } catch {
    // Revert on error
    el.classList.toggle('active', isActive);
    el.setAttribute('aria-checked', String(isActive));
  }
};

const setupEventListeners = () => {
  $('toggle-reading-time')?.addEventListener('click', () => 
    handleToggle('toggle-reading-time', 'readingTimeEstimator'));
  
  $('toggle-focus')?.addEventListener('click', () => 
    handleToggle('toggle-focus', 'focusHighlighter'));
  
  $('toggle-progress')?.addEventListener('click', () => 
    handleToggle('toggle-progress', 'scrollProgressIndicator'));

  $('calibrate-btn')?.addEventListener('click', () => {
    // Open calibration page in a new tab
    chrome.tabs.create({ url: chrome.runtime.getURL('calibration/calibration.html') });
  });

  // Theme toggle button
  $('theme-toggle-btn')?.addEventListener('click', toggleTheme);

  // Keyboard support for toggles
  ['toggle-reading-time', 'toggle-focus', 'toggle-progress'].forEach(id => {
    $(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        $(id)?.click();
      }
    });
  });
};

// ============================================
// INITIALIZATION
// ============================================

const init = async () => {
  console.log('[Glimpse Popup] Initializing...');

  // Initialize theme first (before content loads for smooth experience)
  await initTheme();

  // Fetch data from background
  try {
    [profile, settings, statistics] = await Promise.all([
      sendMessage<UserReadingProfile>('GET_PROFILE'),
      sendMessage<ExtensionSettings>('GET_SETTINGS'),
      sendMessage<ReadingStatistics>('GET_STATISTICS'),
    ]);
    console.log('[Glimpse Popup] Loaded data from storage');
  } catch (e) {
    console.error('[Glimpse Popup] Error loading data:', e);
  }

  // Try to get article data from content script
  try {
    articleData = await sendToActiveTab<ArticleData>('GET_ARTICLE_DATA');
  } catch {
    articleData = null;
  }

  // Update UI
  updateCurrentPage();
  updateReadingSpeed();
  updateStats();
  updateToggles();
  setupEventListeners();

  console.log('[Glimpse Popup] Ready');
};

document.addEventListener('DOMContentLoaded', init);
