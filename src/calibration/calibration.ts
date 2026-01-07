/**
 * Glimpse Extension - Calibration Page Script
 * Measures user's reading speed through a timed reading test
 */

// Mark as module
export {};

// ============================================
// CONSTANTS
// ============================================

const SAMPLE_WORD_COUNT = 350; // Words in the sample text
const MIN_READING_TIME_MS = 10000; // Minimum 10 seconds to avoid cheating
const MAX_READING_TIME_MS = 600000; // Maximum 10 minutes

// ============================================
// STATE
// ============================================

interface CalibrationState {
  isReading: boolean;
  startTime: number | null;
  endTime: number | null;
  timerInterval: number | null;
  calculatedWPM: number | null;
}

const state: CalibrationState = {
  isReading: false,
  startTime: null,
  endTime: null,
  timerInterval: null,
  calculatedWPM: null,
};

// ============================================
// DOM HELPERS
// ============================================

const $ = (id: string) => document.getElementById(id);
const show = (id: string) => { const el = $(id); if (el) el.style.display = 'block'; };
const hide = (id: string) => { const el = $(id); if (el) el.style.display = 'none'; };

// ============================================
// TIMER
// ============================================

const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const updateTimerDisplay = (): void => {
  if (!state.startTime) return;
  const elapsed = Date.now() - state.startTime;
  const timerDisplay = $('timer-display');
  if (timerDisplay) {
    timerDisplay.textContent = formatTime(elapsed);
  }
};

const startTimer = (): void => {
  state.startTime = Date.now();
  state.isReading = true;
  state.timerInterval = window.setInterval(updateTimerDisplay, 100);
};

const stopTimer = (): void => {
  state.endTime = Date.now();
  state.isReading = false;
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
};

// ============================================
// CALCULATION
// ============================================

const calculateWPM = (): number => {
  if (!state.startTime || !state.endTime) return 238; // Default
  
  const elapsedMs = state.endTime - state.startTime;
  
  // Validate reading time
  if (elapsedMs < MIN_READING_TIME_MS) {
    console.warn('[Glimpse] Reading too fast, using minimum time');
    return Math.round(SAMPLE_WORD_COUNT / (MIN_READING_TIME_MS / 60000));
  }
  
  if (elapsedMs > MAX_READING_TIME_MS) {
    console.warn('[Glimpse] Reading too slow, capping time');
    return Math.round(SAMPLE_WORD_COUNT / (MAX_READING_TIME_MS / 60000));
  }
  
  const minutes = elapsedMs / 60000;
  return Math.round(SAMPLE_WORD_COUNT / minutes);
};

const getReadingLevel = (wpm: number): { text: string; position: number } => {
  let text: string;
  let position: number;
  
  if (wpm < 150) {
    text = "You're a careful, thorough reader. You take your time to absorb every detail.";
    position = 0;
  } else if (wpm < 200) {
    text = "You read at a relaxed pace, which is great for comprehension and retention.";
    position = 20;
  } else if (wpm < 250) {
    text = "You're right around the average reading speed. A good balance of speed and comprehension!";
    position = 50;
  } else if (wpm < 300) {
    text = "You're a quick reader! You process text efficiently while maintaining comprehension.";
    position = 70;
  } else if (wpm < 400) {
    text = "Impressive! You're a fast reader, likely skimming less important parts.";
    position = 85;
  } else {
    text = "Wow! You're an exceptionally fast reader. You might be speed reading!";
    position = 100;
  }
  
  return { text, position };
};

// ============================================
// CHROME STORAGE
// ============================================

const saveReadingSpeed = async (wpm: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('userReadingProfile', (result) => {
      const profile = result.userReadingProfile || {
        wordsPerMinute: 238,
        isCalibrated: false,
        lastCalibrationDate: null,
        siteSpeedAdjustments: {},
      };
      
      profile.wordsPerMinute = wpm;
      profile.isCalibrated = true;
      profile.lastCalibrationDate = Date.now();
      
      chrome.storage.local.set({ userReadingProfile: profile }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          console.log('[Glimpse] Reading speed saved:', wpm, 'WPM');
          resolve();
        }
      });
    });
  });
};

// ============================================
// UI TRANSITIONS
// ============================================

const showIntro = (): void => {
  hide('reading-section');
  hide('results-section');
  hide('success-section');
  show('intro-section');
};

const showReading = (): void => {
  hide('intro-section');
  hide('results-section');
  hide('success-section');
  show('reading-section');
  startTimer();
};

const showResults = (): void => {
  stopTimer();
  
  const wpm = calculateWPM();
  state.calculatedWPM = wpm;
  
  const elapsedMs = (state.endTime || Date.now()) - (state.startTime || Date.now());
  const { text, position } = getReadingLevel(wpm);
  
  // Update results UI
  const resultWPM = $('result-wpm');
  const resultTime = $('result-time');
  const compIndicator = $('comparison-indicator');
  const compText = $('comparison-text');
  
  if (resultWPM) resultWPM.textContent = String(wpm);
  if (resultTime) resultTime.textContent = formatTime(elapsedMs);
  if (compIndicator) compIndicator.style.left = `${position}%`;
  if (compText) compText.textContent = text;
  
  hide('intro-section');
  hide('reading-section');
  hide('success-section');
  show('results-section');
};

const showSuccess = (): void => {
  const finalWPM = $('final-wpm');
  if (finalWPM && state.calculatedWPM) {
    finalWPM.textContent = String(state.calculatedWPM);
  }
  
  hide('intro-section');
  hide('reading-section');
  hide('results-section');
  show('success-section');
};

const resetCalibration = (): void => {
  state.isReading = false;
  state.startTime = null;
  state.endTime = null;
  state.calculatedWPM = null;
  
  const timerDisplay = $('timer-display');
  if (timerDisplay) timerDisplay.textContent = '0:00';
  
  showIntro();
};

// ============================================
// EVENT HANDLERS
// ============================================

const handleStart = (): void => {
  console.log('[Glimpse] Starting calibration');
  showReading();
};

const handleDone = (): void => {
  console.log('[Glimpse] Finished reading');
  showResults();
};

const handleSave = async (): Promise<void> => {
  if (!state.calculatedWPM) return;
  
  const saveBtn = $('save-btn') as HTMLButtonElement;
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }
  
  try {
    await saveReadingSpeed(state.calculatedWPM);
    showSuccess();
  } catch (error) {
    console.error('[Glimpse] Error saving:', error);
    alert('Error saving your reading speed. Please try again.');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        Save My Reading Speed
      `;
    }
  }
};

const handleRetry = (): void => {
  console.log('[Glimpse] Retrying calibration');
  resetCalibration();
};

const handleClose = (): void => {
  window.close();
};

// ============================================
// THEME MANAGEMENT
// ============================================

type Theme = 'light' | 'dark' | 'system';

const getSystemTheme = (): 'light' | 'dark' => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme: Theme): void => {
  const root = document.documentElement;
  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
  
  root.classList.remove('light', 'dark');
  root.classList.add(effectiveTheme);
};

const initTheme = async (): Promise<void> => {
  try {
    const result = await chrome.storage.local.get(['theme']);
    const savedTheme: Theme = result.theme ?? 'system';
    applyTheme(savedTheme);
  } catch (e) {
    console.error('[Glimpse] Error loading theme:', e);
    applyTheme('system');
  }
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    const result = await chrome.storage.local.get(['theme']);
    const currentTheme: Theme = result.theme ?? 'system';
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  });
};

// ============================================
// INITIALIZATION
// ============================================

const init = async (): Promise<void> => {
  console.log('[Glimpse] Calibration page loaded');
  
  // Initialize theme first
  await initTheme();
  
  // Attach event listeners
  $('start-btn')?.addEventListener('click', handleStart);
  $('done-btn')?.addEventListener('click', handleDone);
  $('save-btn')?.addEventListener('click', handleSave);
  $('retry-btn')?.addEventListener('click', handleRetry);
  $('close-btn')?.addEventListener('click', handleClose);
  
  // Set word count display
  const wordCountEl = $('word-count');
  if (wordCountEl) wordCountEl.textContent = String(SAMPLE_WORD_COUNT);
  
  // Show intro
  showIntro();
};

document.addEventListener('DOMContentLoaded', init);

