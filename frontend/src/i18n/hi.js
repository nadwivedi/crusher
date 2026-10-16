import SCREENS from './hi-screens';
import SENTENCES from './hi-sentences';
import MESSAGES from './hi-messages';
import PATTERNS from './hi-patterns';

// Every English line the app shows, with its Hindi
const HINDI = { ...SCREENS, ...SENTENCES, ...MESSAGES, ...PATTERNS };

export default HINDI;
