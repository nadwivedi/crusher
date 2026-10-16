import { applyLanguage } from './translator';

export const LANGUAGES = [
  { value: 'en', label: 'English', hint: 'English' },
  { value: 'hi', label: 'हिंदी', hint: 'Hindi' },
  { value: 'both', label: 'English + हिंदी', hint: 'Both together' }
];

const STORAGE_KEY = 'crusher-language';

const normalize = (value) => (value === 'hi' || value === 'both' ? value : 'en');

// The language last used on this device: shows the login page in it before anyone signs in
export const getStoredLanguage = () => {
  try {
    return normalize(localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'en';
  }
};

export const setLanguage = (value) => {
  const language = normalize(value);
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // The account still keeps it; this device just will not remember it before sign-in
  }
  applyLanguage(language);
  return language;
};

export const startLanguage = () => applyLanguage(getStoredLanguage());
