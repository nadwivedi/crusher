/* eslint-disable no-control-regex -- indicator frames use STX/ETX/CR control characters */
// Reads weighbridge indicator output (RS-232 text) into a weight in kg.
// Every indicator make sends its own text, so each format is a "profile".

const STX = '\x02';
const ETX = '\x03';

// Weight unit the indicator sends, as a kg multiplier
export const UNITS = [
  { value: 'kg', label: 'Kilogram (kg)', factor: 1 },
  { value: 'quintal', label: 'Quintal', factor: 100 },
  { value: 'ton', label: 'Ton', factor: 1000 }
];

const unitFactor = (unit) => UNITS.find((u) => u.value === unit)?.factor || 1;

// "ST" / "US" anywhere in the line: the indicator's own stable flag; null when it sends none
const readStableFlag = (line) => {
  if (/\bUS\b|\bMO\b|\bM\b/.test(line)) return false;
  if (/\bST\b|\bS\b/.test(line)) return true;
  return null;
};

const toNumber = (sign, digits) => {
  const value = Number.parseFloat(digits);
  if (!Number.isFinite(value)) return null;
  return sign === '-' ? -value : value;
};

export const PROFILES = [
  {
    id: 'avery',
    label: 'Avery / ST,GS style',
    example: 'ST,GS,+00679.4Kg',
    parse: (line) => {
      if (/^\s*OL\b/i.test(line)) return { overload: true };
      const m = line.match(/(ST|US)\s*,\s*(GS|GR|NT)?\s*,?\s*([+-])?\s*(\d+(?:\.\d+)?)/i);
      if (!m) return null;
      return { weight: toNumber(m[3], m[4]), stable: m[1].toUpperCase() === 'ST' };
    }
  },
  {
    id: 'stx',
    label: 'STX … ETX framed',
    example: '<STX>  12340 kg<ETX>',
    parse: (line, raw) => {
      if (!raw.includes(STX) && !raw.includes(ETX)) return null;
      const m = line.match(/([+-])?\s*(\d+(?:\.\d+)?)/);
      if (!m) return null;
      return { weight: toNumber(m[1], m[2]), stable: readStableFlag(line) };
    }
  },
  {
    id: 'xk3190',
    label: 'XK3190 (= reversed digits)',
    example: '=0.04321  (shows 12340.0)',
    // Sends "=" then the digits lowest first, sign last; confirm against the indicator display
    parse: (line) => {
      const m = line.match(/^=\s*([0-9.]+)\s*(-)?/);
      if (!m) return null;
      const reversed = m[1].split('').reverse().join('');
      return { weight: toNumber(m[2] ? '-' : '+', reversed), stable: null };
    }
  },
  {
    id: 'plain',
    label: 'Plain number',
    example: '+0012340',
    parse: (line) => {
      const m = line.match(/([+-])?\s*(\d+(?:\.\d+)?)/);
      if (!m) return null;
      return { weight: toNumber(m[1], m[2]), stable: readStableFlag(line) };
    }
  },
  {
    id: 'custom',
    label: 'Custom pattern (regex)',
    example: 'W:(\\d+)',
    parse: (line, raw, settings) => {
      let re;
      try {
        re = new RegExp(settings.customRegex || '(\\d+)');
      } catch {
        return null;
      }
      const m = line.match(re);
      if (!m || m[1] == null) return null;
      return { weight: Number.parseFloat(m[1]), stable: readStableFlag(line) };
    }
  }
];

export const findProfile = (id) => PROFILES.find((p) => p.id === id) || PROFILES[3];

// Cleans one received frame; raw keeps the control characters so STX framing can be recognised
const cleanLine = (raw) => raw.replace(/[\x00-\x1f\x7f]/g, ' ').trim();

// Parses one frame with the chosen profile; weight comes back in kg
export const parseFrame = (raw, settings) => {
  const line = cleanLine(raw);
  if (!line) return null;
  const profile = findProfile(settings.profile);
  const result = profile.parse(line, raw, settings);
  if (!result) return null;
  if (result.overload) return { overload: true, stable: false, weightKg: null };
  if (result.weight == null || !Number.isFinite(result.weight)) return null;
  const multiplier = Number(settings.multiplier) || 1;
  const weightKg = result.weight * multiplier * unitFactor(settings.unit);
  return { weightKg: Math.round(weightKg * 100) / 100, stable: result.stable };
};

// Splits incoming serial text into frames. XK3190 frames have no line end, so "=" also starts a frame.
export const createFrameSplitter = (onFrame) => {
  let buffer = '';
  return {
    push(chunk, splitOnEquals) {
      buffer += chunk;
      if (splitOnEquals) buffer = buffer.replace(/(?<!^)(?<![\r\n])=/g, '\n=');
      const parts = buffer.split(/\r\n|\r|\n|\x03/);
      buffer = parts.pop() || '';
      // A frame that never ends (wrong settings) would grow forever
      if (buffer.length > 256) {
        parts.push(buffer);
        buffer = '';
      }
      parts.forEach((part) => {
        if (part.length) onFrame(part.includes(STX) ? `${part}${ETX}` : part);
      });
    },
    reset() {
      buffer = '';
    }
  };
};

// Tries each built-in profile on sample frames and returns the one that reads them best
export const detectProfile = (frames, baseSettings) => {
  const candidates = PROFILES.filter((p) => p.id !== 'custom');
  let best = null;
  candidates.forEach((profile) => {
    const settings = { ...baseSettings, profile: profile.id, multiplier: 1 };
    const weights = frames
      .map((frame) => parseFrame(frame, settings))
      .filter((r) => r && r.weightKg != null && r.weightKg >= 0 && r.weightKg <= 200000);
    if (!weights.length) return;
    let score = weights.length / frames.length;
    // Prefer the specific formats when their markers are present
    if (profile.id === 'avery' && frames.some((f) => /\b(ST|US)\s*,/i.test(f))) score += 0.5;
    if (profile.id === 'stx' && frames.some((f) => f.includes(STX))) score += 0.3;
    if (profile.id === 'xk3190' && frames.filter((f) => f.trim().startsWith('=')).length > frames.length / 2) score += 0.4;
    if (!best || score > best.score) best = { profile: profile.id, score, sample: weights[weights.length - 1].weightKg };
  });
  return best;
};

// Weight is stable when it stays within the tolerance for the set time and the indicator does not say "moving"
export const createStabilityTracker = () => {
  let window = [];
  return {
    push(reading, settings, now = Date.now()) {
      const stableMs = Number(settings.stableMs) || 2000;
      const tolerance = Number(settings.toleranceKg) || 0;
      window.push({ at: now, kg: reading.weightKg });
      window = window.filter((r) => now - r.at <= stableMs + 500);
      const inSpan = window.filter((r) => now - r.at <= stableMs);
      const covered = window.length > 1 && now - window[0].at >= stableMs;
      const values = inSpan.map((r) => r.kg);
      const spread = values.length ? Math.max(...values) - Math.min(...values) : Infinity;
      const steady = covered && spread <= tolerance;
      return steady && reading.stable !== false;
    },
    reset() {
      window = [];
    }
  };
};

// Builds one frame in a profile's format; used by the simulator
export const formatFrame = (profileId, weightKg, stable) => {
  const kg = Math.round(weightKg);
  const sign = kg < 0 ? '-' : '+';
  const abs = String(Math.abs(kg));
  switch (profileId) {
    case 'avery':
      return `${stable ? 'ST' : 'US'},GS,${sign}${abs.padStart(7, '0')}kg\r\n`;
    case 'stx':
      return `${STX}${sign}${abs.padStart(7, ' ')} kg ${stable ? 'S' : 'M'}${ETX}`;
    case 'xk3190':
      return `=${`${abs}.0`.split('').reverse().join('').padEnd(8, '0')}${kg < 0 ? '-' : ''}`;
    default:
      return `${sign}${abs.padStart(7, '0')}\r\n`;
  }
};

// Shows control characters so the raw view explains what the indicator sends
export const visibleText = (raw) =>
  raw
    .replace(/\x02/g, '⟨STX⟩')
    .replace(/\x03/g, '⟨ETX⟩')
    .replace(/\r/g, '⟨CR⟩')
    .replace(/\n/g, '⟨LF⟩')
    .replace(/[\x00-\x1f\x7f]/g, (c) => `⟨${c.charCodeAt(0).toString(16).padStart(2, '0')}⟩`);

export const hexText = (raw) =>
  Array.from(raw)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join(' ');

// USB-to-serial adapter makers, by USB vendor id
const USB_VENDORS = { 0x0403: 'FTDI', 0x067b: 'Prolific PL2303', 0x1a86: 'CH340', 0x10c4: 'Silicon Labs CP210x' };
export const describePort = (port) => {
  const info = port?.getInfo?.() || {};
  if (!info.usbVendorId) return 'Serial port';
  return `${USB_VENDORS[info.usbVendorId] || 'USB'} serial adapter`;
};
