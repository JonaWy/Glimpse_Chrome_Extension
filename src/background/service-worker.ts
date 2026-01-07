/**
 * Glimpse Extension - Background Service Worker
 * Self-contained - NO EXTERNAL IMPORTS
 */

// Mark as module to avoid global scope conflicts
export {};

// ============================================
// TYPES
// ============================================

interface UserReadingProfile {
  wordsPerMinute: number;
  isCalibrated: boolean;
  lastCalibrationDate: number | null;
  siteSpeedAdjustments: Record<string, number>;
}

interface ReadingStatistics {
  pagesRead: number;
  wordsRead: number;
  articlesCompleted: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  dailyStats: Record<string, { wordsRead: number; articlesCompleted: number; timeSpentSeconds: number }>;
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
// STORAGE KEYS & DEFAULTS
// ============================================

const STORAGE_KEYS = {
  USER_PROFILE: 'userReadingProfile',
  STATISTICS: 'readingStatistics',
  SETTINGS: 'extensionSettings',
};

const DEFAULT_PROFILE: UserReadingProfile = {
  wordsPerMinute: 238,
  isCalibrated: false,
  lastCalibrationDate: null,
  siteSpeedAdjustments: {},
};

const DEFAULT_STATISTICS: ReadingStatistics = {
  pagesRead: 0,
  wordsRead: 0,
  articlesCompleted: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  dailyStats: {},
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
// STORAGE HELPERS
// ============================================

const getUserProfile = async (): Promise<UserReadingProfile> => {
  const result = await chrome.storage.local.get(STORAGE_KEYS.USER_PROFILE);
  return result[STORAGE_KEYS.USER_PROFILE] ?? { ...DEFAULT_PROFILE };
};

const saveUserProfile = async (profile: Partial<UserReadingProfile>): Promise<void> => {
  const current = await getUserProfile();
  await chrome.storage.local.set({
    [STORAGE_KEYS.USER_PROFILE]: { ...current, ...profile },
  });
};

const getStatistics = async (): Promise<ReadingStatistics> => {
  const result = await chrome.storage.local.get(STORAGE_KEYS.STATISTICS);
  return result[STORAGE_KEYS.STATISTICS] ?? { ...DEFAULT_STATISTICS };
};

const saveStatistics = async (stats: Partial<ReadingStatistics>): Promise<void> => {
  const current = await getStatistics();
  await chrome.storage.local.set({
    [STORAGE_KEYS.STATISTICS]: { ...current, ...stats },
  });
};

const getSettings = async (): Promise<ExtensionSettings> => {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return result[STORAGE_KEYS.SETTINGS] ?? { ...DEFAULT_SETTINGS };
};

const saveSettings = async (settings: Partial<ExtensionSettings>): Promise<void> => {
  const current = await getSettings();
  await chrome.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: { ...current, ...settings },
  });
};

/**
 * Notify all tabs about a change
 */
const notifyAllTabs = async (type: string, payload?: unknown): Promise<void> => {
  try {
    const tabs = await chrome.tabs.query({});
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type, payload }).catch(() => {
          // Tab might not have content script, ignore error
        });
      }
    });
  } catch (e) {
    console.error('[Glimpse] Error notifying tabs:', e);
  }
};

// ============================================
// MESSAGE HANDLING
// ============================================

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { type, payload } = message;

  const handleAsync = async () => {
    switch (type) {
      case 'GET_PROFILE':
        return getUserProfile();
      
      case 'UPDATE_PROFILE':
        await saveUserProfile(payload);
        return { success: true };
      
      case 'GET_SETTINGS':
        return getSettings();
      
      case 'UPDATE_SETTINGS':
        await saveSettings(payload);
        // Notify all tabs about settings change
        notifyAllTabs('SETTINGS_UPDATED');
        return { success: true };
      
      case 'GET_STATISTICS':
        return getStatistics();
      
      case 'UPDATE_STATISTICS':
        await saveStatistics(payload);
        return { success: true };
      
      case 'ARTICLE_DATA_RESPONSE':
        console.log('[Glimpse] Received article data:', payload?.title);
        return { success: true };
      
      case 'CALIBRATION_COMPLETE':
        await saveUserProfile({
          wordsPerMinute: payload.wordsPerMinute,
          isCalibrated: true,
          lastCalibrationDate: Date.now(),
        });
        return { success: true };
      
      default:
        return { error: 'Unknown message type' };
    }
  };

  handleAsync()
    .then(sendResponse)
    .catch((error) => sendResponse({ error: error.message }));

  return true; // Keep channel open for async response
});

// ============================================
// EXTENSION LIFECYCLE
// ============================================

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Glimpse] Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Initialize with defaults
    await chrome.storage.local.set({
      [STORAGE_KEYS.USER_PROFILE]: DEFAULT_PROFILE,
      [STORAGE_KEYS.STATISTICS]: DEFAULT_STATISTICS,
      [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS,
    });
    console.log('[Glimpse] Initialized with default values');
  }
});

// Update streak when tab loads
chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const stats = await getStatistics();
    const today = new Date().toISOString().split('T')[0];
    
    if (stats.lastActiveDate !== today) {
      let newStreak = 1;
      
      if (stats.lastActiveDate) {
        const lastDate = new Date(stats.lastActiveDate);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          newStreak = stats.currentStreak + 1;
        }
      }
      
      await saveStatistics({
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, stats.longestStreak),
        lastActiveDate: today,
      });
    }
  }
});

console.log('[Glimpse] Background service worker started');
