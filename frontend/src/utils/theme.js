// Light or dark look, picked in Settings → Appearance and kept on this device
const THEME_KEY = 'crusher-theme';
const THEMES = ['light', 'dark', 'system'];

const systemPrefersDark = () => typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export const getStoredTheme = () => {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    return THEMES.includes(stored) ? stored : 'light';
  } catch {
    return 'light';
  }
};

// Puts the "dark" class on <html> when the page should be dark; index.css does the rest
export const applyTheme = (theme = getStoredTheme()) => {
  const isDark = theme === 'dark' || (theme === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', isDark);
  return isDark;
};

export const setStoredTheme = (theme) => {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage can be blocked (private window); the theme still applies for this visit
  }
  applyTheme(theme);
};

// "System" follows the device when it switches between light and dark
export const watchSystemTheme = () => {
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (!media) return () => {};
  const handleChange = () => {
    if (getStoredTheme() === 'system') applyTheme('system');
  };
  media.addEventListener('change', handleChange);
  return () => media.removeEventListener('change', handleChange);
};
