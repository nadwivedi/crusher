import { useSyncExternalStore } from 'react';
import { canInstall, promptInstall, subscribeInstall } from '../utils/pwaInstall';

// True while the browser is offering to install CrusherBook
export default function usePwaInstall() {
  const installable = useSyncExternalStore(subscribeInstall, canInstall, () => false);
  return { installable, install: promptInstall };
}
