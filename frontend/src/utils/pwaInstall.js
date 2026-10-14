// The browser's "install app" offer arrives once, often before any page has loaded,
// so it is caught here at start-up and handed to whichever screen shows an Install button.
let deferredPrompt = null;
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener());

export const isAppInstalled = () => {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  } catch {
    return false;
  }
};

export const startInstallListener = () => {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
};

export const canInstall = () => Boolean(deferredPrompt) && !isAppInstalled();

export const subscribeInstall = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Opens the browser's install dialog; the offer can be used only once
export const promptInstall = async () => {
  if (!deferredPrompt) return false;
  const prompt = deferredPrompt;
  deferredPrompt = null;
  notify();
  prompt.prompt();
  const { outcome } = await prompt.userChoice;
  return outcome === 'accepted';
};
