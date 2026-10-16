import HINDI from './hi';

// Shows the app in Hindi by swapping the English words on screen for their Hindi ones from the dictionary.
// It works on what React draws, so every page, popup and toast is covered without changing each screen.
// Typed data (party names, vehicle numbers, amounts) has no dictionary entry and stays as it is.

const ATTRIBUTES = ['placeholder', 'title', 'aria-label'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'svg']);
const HAS_LETTERS = /[A-Za-z]{2}/;

const MONTHS = {
  Jan: 'जन', Feb: 'फ़र', Mar: 'मार्च', Apr: 'अप्रै', May: 'मई', Jun: 'जून', Jul: 'जुला', Aug: 'अग', Sep: 'सित', Oct: 'अक्टू', Nov: 'नव', Dec: 'दिस',
  January: 'जनवरी', February: 'फ़रवरी', March: 'मार्च', April: 'अप्रैल', June: 'जून', July: 'जुलाई', August: 'अगस्त',
  September: 'सितंबर', October: 'अक्टूबर', November: 'नवंबर', December: 'दिसंबर',
  Mon: 'सोम', Tue: 'मंगल', Wed: 'बुध', Thu: 'गुरु', Fri: 'शुक्र', Sat: 'शनि', Sun: 'रवि',
  am: 'AM', pm: 'PM', AM: 'AM', PM: 'PM'
};
// A date or time on its own ("16 Oct 2026", "Oct 2026", "10:30 am"): only month and day names change
const DATE_ONLY = new RegExp(`^[\\d\\s,/:.\\-]*(?:(?:${Object.keys(MONTHS).join('|')})\\b[\\d\\s,/:.\\-]*)+$`);
const DATE_WORD = new RegExp(`\\b(${Object.keys(MONTHS).join('|')})\\b`, 'g');

// Bits around a label that are not words: "Vehicle *", "Balance:", "+ Add Party", "Saving...", "· Bal"
const DECORATION = /^([+•·\-–—(\s]*)(.*?)([\s*:.…·)?!,]*)$/s;

const exact = new Map();
const lower = new Map();
const patterns = [];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const [english, hindi] of Object.entries(HINDI)) {
  const key = english.replace(/\s+/g, ' ').trim();
  if (/\{\d\}/.test(key)) {
    // "Delete {0}?" matches "Delete Sale 12?" and puts the captured part into the Hindi text
    const literals = key.split(/\{\d\}/).map((part) => part.trim()).filter(Boolean);
    if (!literals.join('').match(HAS_LETTERS)) continue;
    const order = [...key.matchAll(/\{(\d)\}/g)].map((match) => Number(match[1]));
    const source = key.split(/\{\d\}/).map(escapeRegex).join('(.*?)');
    patterns.push({
      regex: new RegExp(`^${source}$`, 's'),
      hint: [...literals].sort((a, b) => b.length - a.length)[0],
      fixedLength: literals.join('').length,
      order,
      hindi
    });
  } else {
    exact.set(key, hindi);
    if (!lower.has(key.toLowerCase())) lower.set(key.toLowerCase(), hindi);
  }
}
// The most specific first: "Delete party "{0}"? ..." before "Delete {0}"
patterns.sort((a, b) => b.fixedLength - a.fixedLength);

const lookup = (text) => exact.get(text) ?? lower.get(text.toLowerCase());

const translateDateWords = (text) => text.replace(DATE_WORD, (word) => MONTHS[word] || word);

const cache = new Map();
const CACHE_LIMIT = 8000;

// The Hindi for one piece of on-screen text, or null when there is none
const translateCore = (text, depth = 0) => {
  const direct = lookup(text);
  if (direct !== undefined) return direct;

  if (DATE_ONLY.test(text)) return translateDateWords(text);

  const [, before, core, after] = text.match(DECORATION) || [];
  if (core && core !== text) {
    const found = lookup(core);
    if (found !== undefined) return `${before}${found}${after}`;
  }

  if (depth > 1) return null;
  for (const pattern of patterns) {
    if (!text.includes(pattern.hint)) continue;
    const match = text.match(pattern.regex);
    if (!match) continue;
    const values = match.slice(1).map((value) => {
      const inner = value.trim() && HAS_LETTERS.test(value) ? translateCore(value.trim(), depth + 1) : null;
      return inner ?? value;
    });
    return pattern.hindi.replace(/\{(\d)\}/g, (_, index) => values[pattern.order.indexOf(Number(index))] ?? '');
  }
  return null;
};

export const translateText = (value) => {
  if (!value || !HAS_LETTERS.test(value)) return null;
  if (cache.has(value)) return cache.get(value);

  const leading = value.match(/^\s*/)[0];
  const trailing = value.slice(leading.length).match(/\s*$/)[0];
  const text = value.slice(leading.length, value.length - trailing.length).replace(/\s+/g, ' ');
  const hindi = translateCore(text);
  const result = hindi === null ? null : `${leading}${hindi}${trailing}`;

  if (cache.size > CACHE_LIMIT) cache.clear();
  cache.set(value, result);
  return result;
};

// What each node showed in English and what was done to it, so English can be put back
const textRecords = new WeakMap();
const attributeRecords = new WeakMap();

// "hi": Hindi in place of English. "both": English stays, with the Hindi under it (or after it).
let mode = 'en';

// Places that can only hold plain text: the Hindi goes into the same line ("Cash / नकद")
const TEXT_ONLY_PARENTS = new Set(['OPTION', 'SELECT', 'TITLE', 'text', 'tspan']);

const isSkipped = (element) => {
  for (let node = element; node && node !== document.body; node = node.parentElement) {
    if (SKIP_TAGS.has(node.tagName) || node.isContentEditable || node.getAttribute?.('translate') === 'no') return true;
  }
  return false;
};

const isOurs = (node) => node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('data-i18n');

// A label on its own ("Sale Date") gets its Hindi on the next line; text mixed with other
// pieces (an icon, a number in bold) gets it right after, so the line does not break apart
const isOnlyText = (node) => [...node.parentNode.childNodes].every((child) => (
  child === node || isOurs(child) || (child.nodeType === Node.TEXT_NODE && !child.nodeValue.trim())
));

const bothText = (english, hindi) => `${english.trimEnd()} / ${hindi.trim()}${english.match(/\s*$/)[0]}`;

const forget = (node) => {
  textRecords.get(node)?.span?.remove();
  textRecords.delete(node);
};

const translateTextNode = (node) => {
  const record = textRecords.get(node);
  const current = node.nodeValue;
  if (record && current === record.shown) return;
  // New text from React (or never seen): this is the English to work from
  forget(node);
  const hindi = translateText(current);
  if (hindi === null || hindi === current) return;
  const parent = node.parentElement;
  if (!parent || isSkipped(parent)) return;
  // Next to English, a date in Hindi only repeats the same numbers
  if (mode === 'both' && DATE_ONLY.test(current.trim())) return;

  if (mode === 'hi') {
    textRecords.set(node, { english: current, shown: hindi });
    node.nodeValue = hindi;
    return;
  }

  if (TEXT_ONLY_PARENTS.has(parent.tagName)) {
    const shown = bothText(current, hindi);
    textRecords.set(node, { english: current, shown });
    node.nodeValue = shown;
    return;
  }

  const span = document.createElement('span');
  span.className = isOnlyText(node) ? 'i18n-hi' : 'i18n-hi i18n-hi-inline';
  span.lang = 'hi';
  span.setAttribute('data-i18n', '');
  span.setAttribute('translate', 'no');
  span.textContent = hindi.trim();
  parent.insertBefore(span, node.nextSibling);
  textRecords.set(node, { english: current, shown: current, span });
};

const translateAttributes = (element) => {
  if (!element.getAttribute || isOurs(element)) return;
  let records = attributeRecords.get(element);
  for (const name of ATTRIBUTES) {
    const current = element.getAttribute(name);
    if (current === null) continue;
    if (records?.[name] && records[name].shown === current) continue;
    const hindi = translateText(current);
    if (hindi === null || hindi === current) continue;
    const shown = mode === 'hi' ? hindi : bothText(current, hindi);
    if (!records) {
      records = {};
      attributeRecords.set(element, records);
    }
    records[name] = { english: current, shown };
    element.setAttribute(name, shown);
  }
};

const translateTree = (root) => {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE || SKIP_TAGS.has(root.tagName) || isOurs(root)) return;
  translateAttributes(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => (node.nodeType === Node.ELEMENT_NODE && (SKIP_TAGS.has(node.tagName) || isOurs(node))
      ? NodeFilter.FILTER_REJECT
      : NodeFilter.FILTER_ACCEPT)
  });
  // Collected first: adding the Hindi lines while walking would walk into them
  const nodes = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node);
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
    else translateAttributes(node);
  }
};

const restoreTree = (root) => {
  root.querySelectorAll('[data-i18n]').forEach((span) => span.remove());
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let node = walker.currentNode; node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      const record = textRecords.get(node);
      if (record && node.nodeValue === record.shown) node.nodeValue = record.english;
      textRecords.delete(node);
    } else {
      const records = attributeRecords.get(node);
      if (!records) continue;
      for (const [name, record] of Object.entries(records)) {
        if (node.getAttribute(name) === record.shown) node.setAttribute(name, record.english);
      }
      attributeRecords.delete(node);
    }
  }
};

let observer = null;
let nativeConfirm = null;
let nativeAlert = null;

// "Delete this sale?" boxes are drawn by the browser, not the page
const dialogText = (message) => {
  const english = String(message ?? '');
  const hindi = translateText(english);
  if (hindi === null) return message;
  return mode === 'hi' ? hindi : `${english}\n\n${hindi}`;
};

const start = () => {
  translateTree(document.body);
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') translateTextNode(mutation.target);
      else if (mutation.type === 'attributes') translateAttributes(mutation.target);
      else {
        // Text React took away takes its Hindi line with it
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) forget(node);
        });
        mutation.addedNodes.forEach(translateTree);
      }
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRIBUTES
  });

  nativeConfirm = window.confirm;
  nativeAlert = window.alert;
  window.confirm = (message) => nativeConfirm.call(window, dialogText(message));
  window.alert = (message) => nativeAlert.call(window, dialogText(message));
};

const stop = () => {
  if (!observer) return;
  observer.disconnect();
  observer = null;
  restoreTree(document.body);
  if (nativeConfirm) window.confirm = nativeConfirm;
  if (nativeAlert) window.alert = nativeAlert;
};

// "en", "hi" or "both"
export const applyLanguage = (language) => {
  const next = language === 'hi' || language === 'both' ? language : 'en';
  document.documentElement.lang = next === 'hi' ? 'hi' : 'en';
  document.documentElement.dataset.language = next;
  if (next === mode) return;
  stop();
  mode = next;
  if (mode !== 'en') start();
};
