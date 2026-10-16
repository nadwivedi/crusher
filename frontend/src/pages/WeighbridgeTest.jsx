import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  AlertTriangle, ArrowLeft, Cable, CheckCircle2, FlaskConical, Pause, Play, Plug, PlugZap, Printer,
  RotateCcw, Scale, Search, Trash2, Truck, Unplug, Wand2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  PROFILES, UNITS, createFrameSplitter, createStabilityTracker, describePort, detectProfile,
  findProfile, formatFrame, hexText, parseFrame, visibleText
} from '../utils/weighbridgeParser';

// Test page for reading the weighbridge straight from the browser (Web Serial, Chrome / Edge on a computer).
// Nothing here is saved to the server: settings and test tickets stay in this browser only.

const SETTINGS_KEY = 'cb_weighbridge_test_settings';
const TICKETS_KEY = 'cb_weighbridge_test_tickets';

const DEFAULT_SETTINGS = {
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  profile: 'avery',
  unit: 'kg',
  multiplier: 1,
  customRegex: '(\\d+)',
  stableMs: 2000,
  toleranceKg: 20,
  minWeightKg: 500
};

const BAUD_RATES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
const NO_DATA_MS = 3000;
const RAW_LINES = 40;

const readStored = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
};
const writeStored = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: the page still works for this visit */
  }
};

const formatKg = (kg) => (kg == null ? '—' : Number(kg).toLocaleString('en-IN', { maximumFractionDigits: 2 }));
const formatTime = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' }) : '—');

const serialSupported = typeof navigator !== 'undefined' && 'serial' in navigator;

export default function WeighbridgeTest() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...readStored(SETTINGS_KEY, {}) }));
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
    writeStored(SETTINGS_KEY, settings);
  }, [settings]);

  // source: null | 'serial' | 'simulator'
  const [source, setSource] = useState(null);
  const [portLabel, setPortLabel] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [reading, setReading] = useState({ weightKg: null, stable: false, overload: false, at: 0 });
  const [rawLines, setRawLines] = useState([]);
  const [showHex, setShowHex] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lastFrameAt, setLastFrameAt] = useState(0);
  const [connectedAt, setConnectedAt] = useState(0);
  const [frameCount, setFrameCount] = useState({ total: 0, parsed: 0 });
  const [now, setNow] = useState(Date.now());

  const portRef = useRef(null);
  const readerRef = useRef(null);
  const pipeRef = useRef(null);
  const keepReadingRef = useRef(false);
  const simTimerRef = useRef(null);
  const simStateRef = useRef({ target: 0, current: 0 });
  const rawBufferRef = useRef([]);
  const sampleFramesRef = useRef([]);
  const pausedRef = useRef(false);
  const trackerRef = useRef(createStabilityTracker());
  const countsRef = useRef({ total: 0, parsed: 0 });

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const handleFrame = useCallback((frame) => {
    const at = Date.now();
    countsRef.current.total += 1;
    sampleFramesRef.current.push(frame);
    if (sampleFramesRef.current.length > 60) sampleFramesRef.current.shift();
    if (!pausedRef.current) {
      rawBufferRef.current.push({ at, frame });
      if (rawBufferRef.current.length > RAW_LINES) rawBufferRef.current.shift();
    }
    setLastFrameAt(at);

    const parsed = parseFrame(frame, settingsRef.current);
    if (!parsed) return;
    countsRef.current.parsed += 1;
    if (parsed.overload) {
      trackerRef.current.reset();
      setReading({ weightKg: null, stable: false, overload: true, at });
      return;
    }
    const stable = trackerRef.current.push(parsed, settingsRef.current, at);
    setReading({ weightKg: parsed.weightKg, stable, overload: false, at });
  }, []);

  const splitterRef = useRef(null);
  if (!splitterRef.current) splitterRef.current = createFrameSplitter(handleFrame);

  const pushChunk = useCallback((chunk) => {
    splitterRef.current.push(chunk, settingsRef.current.profile === 'xk3190');
  }, []);

  // Raw view and counters refresh a few times a second instead of on every frame
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      setRawLines([...rawBufferRef.current]);
      setFrameCount({ ...countsRef.current });
    }, 300);
    return () => clearInterval(id);
  }, []);

  const resetReadings = () => {
    splitterRef.current.reset();
    trackerRef.current.reset();
    rawBufferRef.current = [];
    sampleFramesRef.current = [];
    countsRef.current = { total: 0, parsed: 0 };
    setRawLines([]);
    setFrameCount({ total: 0, parsed: 0 });
    setReading({ weightKg: null, stable: false, overload: false, at: 0 });
    setLastFrameAt(0);
    setConnectedAt(Date.now());
  };

  // ---------- Serial port ----------

  const readLoop = async (port) => {
    while (keepReadingRef.current && port.readable) {
      const decoder = new TextDecoderStream();
      pipeRef.current = port.readable.pipeTo(decoder.writable).catch(() => {});
      const reader = decoder.readable.getReader();
      readerRef.current = reader;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) pushChunk(value);
        }
      } catch (error) {
        // A framing or buffer error on one chunk: keep reading unless the port is gone
        if (keepReadingRef.current) toast.warn(`Read error: ${error.message}`);
      } finally {
        reader.releaseLock();
      }
      await pipeRef.current;
    }
  };

  const openPort = async (port) => {
    const s = settingsRef.current;
    await port.open({
      baudRate: Number(s.baudRate),
      dataBits: Number(s.dataBits),
      stopBits: Number(s.stopBits),
      parity: s.parity,
      bufferSize: 4096
    });
    portRef.current = port;
    keepReadingRef.current = true;
    setPortLabel(describePort(port));
    setSource('serial');
    resetReadings();
    readLoop(port).catch(() => {});
  };

  const connectSerial = async (askForPort = true) => {
    if (!serialSupported) return;
    setConnecting(true);
    try {
      let port = null;
      if (!askForPort) {
        const ports = await navigator.serial.getPorts();
        port = ports[0] || null;
      }
      if (!port) port = await navigator.serial.requestPort();
      await openPort(port);
      toast.success('Weighbridge port connected');
    } catch (error) {
      if (error?.name === 'NotFoundError') return; // user closed the port picker
      toast.error(error?.name === 'InvalidStateError'
        ? 'This port is already open in another program or tab. Close the other weighbridge software and try again.'
        : `Could not open the port: ${error?.message || error}`);
    } finally {
      setConnecting(false);
    }
  };

  const closeSerial = async () => {
    keepReadingRef.current = false;
    try {
      await readerRef.current?.cancel();
    } catch { /* already closed */ }
    try {
      await pipeRef.current;
    } catch { /* ignore */ }
    try {
      await portRef.current?.close();
    } catch { /* ignore */ }
    portRef.current = null;
    readerRef.current = null;
  };

  // ---------- Simulator ----------

  const startSimulator = () => {
    simStateRef.current = { target: 0, current: 0 };
    resetReadings();
    setSource('simulator');
    setPortLabel('Simulator (no weighbridge needed)');
    simTimerRef.current = setInterval(() => {
      const sim = simStateRef.current;
      const gap = sim.target - sim.current;
      if (Math.abs(gap) > 30) {
        // Truck driving on or off: weight moves fast and bounces
        sim.current += gap * 0.35 + (Math.random() - 0.5) * 120;
      } else {
        sim.current = sim.target;
      }
      const stable = sim.current === sim.target;
      const profileId = ['avery', 'stx', 'xk3190'].includes(settingsRef.current.profile) ? settingsRef.current.profile : 'plain';
      pushChunk(formatFrame(profileId, sim.current, stable));
    }, 200);
  };

  const stopSimulator = () => {
    clearInterval(simTimerRef.current);
    simTimerRef.current = null;
  };

  const setSimWeight = (kg) => {
    simStateRef.current.target = kg;
  };

  const disconnect = async () => {
    if (source === 'serial') await closeSerial();
    if (source === 'simulator') stopSimulator();
    setSource(null);
    setPortLabel('');
  };

  // Close the port when leaving the page, so it is free for other software
  useEffect(() => () => {
    keepReadingRef.current = false;
    clearInterval(simTimerRef.current);
    readerRef.current?.cancel().catch(() => {});
    portRef.current?.close().catch(() => {});
  }, []);

  // Cable pulled out
  useEffect(() => {
    if (!serialSupported) return undefined;
    const onDisconnect = (event) => {
      if (event.target === portRef.current) {
        keepReadingRef.current = false;
        portRef.current = null;
        setSource(null);
        setPortLabel('');
        toast.error('Weighbridge cable disconnected');
      }
    };
    navigator.serial.addEventListener('disconnect', onDisconnect);
    return () => navigator.serial.removeEventListener('disconnect', onDisconnect);
  }, []);

  // ---------- Settings ----------

  const updateSetting = (name, value) => {
    setSettings((prev) => ({ ...prev, [name]: value }));
    if (['profile', 'unit', 'multiplier', 'customRegex', 'stableMs', 'toleranceKg'].includes(name)) trackerRef.current.reset();
  };

  // Port settings only apply when the port opens, so reopen it
  const reopenWithSettings = async () => {
    if (source !== 'serial' || !portRef.current) return;
    const port = portRef.current;
    await closeSerial();
    try {
      await openPort(port);
      toast.success('Port reopened with the new settings');
    } catch (error) {
      toast.error(`Could not reopen the port: ${error?.message || error}`);
      setSource(null);
    }
  };

  const autoDetect = () => {
    const frames = sampleFramesRef.current.slice(-30);
    if (frames.length < 5) {
      toast.info('Need a few seconds of data first. Keep the port connected and try again.');
      return;
    }
    const best = detectProfile(frames, settingsRef.current);
    if (!best) {
      toast.error('Could not read a weight with any format. Check the baud rate, or use a custom pattern.');
      return;
    }
    updateSetting('profile', best.profile);
    updateSetting('multiplier', 1);
    toast.success(`Format found: ${findProfile(best.profile).label}. Reads ${formatKg(best.sample)} kg — compare with the indicator display.`);
  };

  // ---------- Test weighments ----------

  const [tickets, setTickets] = useState(() => readStored(TICKETS_KEY, []));
  useEffect(() => writeStored(TICKETS_KEY, tickets), [tickets]);
  const [vehicleNo, setVehicleNo] = useState('');
  const [direction, setDirection] = useState('sale');
  const [manualKg, setManualKg] = useState('');

  const noData = Boolean(source) && now - (lastFrameAt || connectedAt) > NO_DATA_MS;
  const fresh = source && reading.at && now - reading.at < NO_DATA_MS;
  const aboveMin = reading.weightKg != null && reading.weightKg >= Number(settings.minWeightKg || 0);
  const canCapture = fresh && reading.stable && aboveMin && !reading.overload;

  const openTickets = useMemo(() => tickets.filter((t) => t.status === 'open'), [tickets]);
  const nextRst = useMemo(() => tickets.reduce((max, t) => Math.max(max, t.rst || 0), 0) + 1, [tickets]);

  const captureValue = (manual) => {
    if (manual) {
      const kg = Number(manualKg);
      if (!Number.isFinite(kg) || kg <= 0) {
        toast.error('Enter the manual weight in kg');
        return null;
      }
      return { kg, at: new Date().toISOString(), manual: true };
    }
    if (!canCapture) {
      toast.error('Weight is not stable yet');
      return null;
    }
    return { kg: reading.weightKg, at: new Date().toISOString(), manual: false };
  };

  const captureFirst = (manual = false) => {
    const vehicle = vehicleNo.trim().toUpperCase();
    if (!vehicle) {
      toast.error('Enter the vehicle number');
      return;
    }
    if (openTickets.some((t) => t.vehicleNo === vehicle)) {
      toast.error(`${vehicle} already has an open ticket. Capture its second weight below.`);
      return;
    }
    const first = captureValue(manual);
    if (!first) return;
    setTickets((prev) => [
      { id: `${Date.now()}`, rst: nextRst, vehicleNo: vehicle, direction, first, second: null, status: 'open' },
      ...prev
    ]);
    setVehicleNo('');
    setManualKg('');
    toast.success(`RST ${nextRst}: first weight ${formatKg(first.kg)} kg saved`);
  };

  const captureSecond = (id, manual = false) => {
    const second = captureValue(manual);
    if (!second) return;
    setTickets((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const gross = Math.max(t.first.kg, second.kg);
      const tare = Math.min(t.first.kg, second.kg);
      return { ...t, second, gross, tare, net: Math.round((gross - tare) * 100) / 100, status: 'closed' };
    }));
    setManualKg('');
    toast.success('Second weight saved, net worked out');
  };

  const deleteTicket = (id) => setTickets((prev) => prev.filter((t) => t.id !== id));

  const clearTickets = () => {
    if (window.confirm('Delete all test tickets from this browser?')) setTickets([]);
  };

  const printSlip = (t) => {
    const win = window.open('', '_blank', 'width=420,height=600');
    if (!win) {
      toast.error('Allow pop-ups to print the slip');
      return;
    }
    const row = (label, value) => `<tr><td>${label}</td><td style="text-align:right"><b>${value}</b></td></tr>`;
    const firstLabel = t.direction === 'sale' ? 'Tare (empty)' : 'Gross (loaded)';
    const secondLabel = t.direction === 'sale' ? 'Gross (loaded)' : 'Tare (empty)';
    win.document.write(`<!doctype html><html><head><title>RST ${t.rst}</title>
      <style>body{font-family:monospace;padding:16px;font-size:13px}table{width:100%;border-collapse:collapse}td{padding:4px 0;border-bottom:1px dashed #999}h2{margin:0 0 4px;text-align:center}p{text-align:center;margin:0 0 12px}</style>
      </head><body>
      <h2>${(user?.name || 'CrusherBook').replace(/</g, '&lt;')}</h2>
      <p>Weighbridge slip (TEST)</p>
      <table>
        ${row('RST No', t.rst)}
        ${row('Vehicle', t.vehicleNo)}
        ${row('Type', t.direction === 'sale' ? 'Sale' : 'Boulder')}
        ${row(`${firstLabel}${t.first.manual ? ' *' : ''}`, `${formatKg(t.first.kg)} kg`)}
        ${row('First time', formatTime(t.first.at))}
        ${t.second ? row(`${secondLabel}${t.second.manual ? ' *' : ''}`, `${formatKg(t.second.kg)} kg`) : ''}
        ${t.second ? row('Second time', formatTime(t.second.at)) : ''}
        ${t.second ? row('NET', `${formatKg(t.net)} kg`) : ''}
      </table>
      ${(t.first.manual || t.second?.manual) ? '<p style="margin-top:8px">* typed by hand, not read from the weighbridge</p>' : ''}
      <script>window.onload=()=>{window.print()}</script></body></html>`);
    win.document.close();
  };

  // ---------- Render ----------

  const connected = Boolean(source);
  const weightTone = !connected || noData
    ? 'text-slate-300'
    : reading.overload
      ? 'text-rose-600'
      : reading.stable
        ? 'text-emerald-600'
        : 'text-amber-500';
  const parseRate = frameCount.total ? Math.round((frameCount.parsed / frameCount.total) * 100) : 0;

  return (
    <div className="page-fade-in max-w-5xl space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      <div className="flex items-center gap-3">
        <button type="button" className="icon-btn" onClick={() => navigate('/settings')} aria-label="Back to settings" title="Back to settings">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="page-title flex items-center gap-2">Weighbridge <span className="badge-orange">Test</span></h1>
          <p className="page-subtitle">Read the weight straight from your weighbridge indicator. Test only: nothing is saved to your sales.</p>
        </div>
      </div>

      {!serialSupported && (
        <section className="card flex gap-3 border-l-4 border-amber-400">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="text-sm text-slate-700">
            <p className="font-semibold text-slate-900">This browser cannot read a COM port.</p>
            <p className="mt-1">Open CrusherBook in <b>Google Chrome</b> or <b>Microsoft Edge</b> on the weighbridge computer (Windows or Mac). Phones, Firefox and Safari are not supported. You can still try the <b>Simulator</b> below.</p>
          </div>
        </section>
      )}

      {/* Connection */}
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Cable size={16} /> 1. Connect</h2>
          {connected ? (
            <span className="badge-green">{portLabel}</span>
          ) : (
            <span className="badge-gray">Not connected</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <label className="label" htmlFor="wb-baud">Baud rate</label>
            <select id="wb-baud" className="input" value={settings.baudRate} onChange={(e) => updateSetting('baudRate', Number(e.target.value))}>
              {BAUD_RATES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="wb-databits">Data bits</label>
            <select id="wb-databits" className="input" value={settings.dataBits} onChange={(e) => updateSetting('dataBits', Number(e.target.value))}>
              <option value={8}>8</option>
              <option value={7}>7</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="wb-parity">Parity</label>
            <select id="wb-parity" className="input" value={settings.parity} onChange={(e) => updateSetting('parity', e.target.value)}>
              <option value="none">None</option>
              <option value="even">Even</option>
              <option value="odd">Odd</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="wb-stopbits">Stop bits</label>
            <select id="wb-stopbits" className="input" value={settings.stopBits} onChange={(e) => updateSetting('stopBits', Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-500">Most indicators use 9600, 8, None, 1. If the raw data below looks like garbage, try another baud rate.</p>

        <div className="flex flex-wrap gap-2">
          {!connected && (
            <>
              <button type="button" className="btn-primary" disabled={!serialSupported || connecting} onClick={() => connectSerial(true)}>
                <Plug size={16} /> {connecting ? 'Connecting…' : 'Connect weighbridge'}
              </button>
              {serialSupported && (
                <button type="button" className="btn-secondary" disabled={connecting} onClick={() => connectSerial(false)}>
                  <PlugZap size={16} /> Reconnect last port
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={startSimulator}>
                <FlaskConical size={16} /> Start simulator
              </button>
            </>
          )}
          {connected && (
            <>
              <button type="button" className="btn-secondary" onClick={disconnect}>
                <Unplug size={16} /> Disconnect
              </button>
              {source === 'serial' && (
                <button type="button" className="btn-secondary" onClick={reopenWithSettings}>
                  <RotateCcw size={16} /> Apply port settings
                </button>
              )}
            </>
          )}
        </div>

        {source === 'simulator' && (
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="mb-2 text-xs font-semibold text-slate-700">Simulator: put a truck on the bridge</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary btn-sm" onClick={() => setSimWeight(0)}>Empty bridge</button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setSimWeight(8000 + Math.round(Math.random() * 40) * 50)}>Empty truck (~8–10 t)</button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setSimWeight(30000 + Math.round(Math.random() * 200) * 50)}>Loaded truck (~30–40 t)</button>
            </div>
            <p className="mt-2 text-xs text-slate-500">It sends data in the format chosen in step 2, so you can test each format too.</p>
          </div>
        )}
      </section>

      {/* Live weight */}
      <section className="card">
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <div className={`font-mono text-5xl font-extrabold tabular-nums transition-colors md:text-7xl ${weightTone}`}>
            {reading.overload ? 'OVERLOAD' : formatKg(connected ? reading.weightKg : null)}
            {!reading.overload && <span className="ml-2 text-xl font-bold md:text-3xl">kg</span>}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {!connected && <span className="badge-gray">Connect the weighbridge or start the simulator</span>}
            {connected && noData && <span className="badge-red">No data — check cable, port and baud rate</span>}
            {connected && !noData && reading.weightKg == null && !reading.overload && <span className="badge-orange">Data coming, but no weight read — check the format in step 2</span>}
            {connected && !noData && reading.weightKg != null && (reading.stable
              ? <span className="badge-green"><CheckCircle2 size={12} className="mr-1" /> Stable</span>
              : <span className="badge-orange">Moving…</span>)}
            {connected && !noData && reading.weightKg != null && !aboveMin && <span className="badge-gray">Below {formatKg(settings.minWeightKg)} kg: bridge treated as empty</span>}
          </div>
        </div>
      </section>

      {/* Format */}
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Search size={16} /> 2. Data format</h2>
          <button type="button" className="btn-secondary btn-sm" onClick={autoDetect} disabled={!connected}>
            <Wand2 size={14} /> Auto-detect format
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="label" htmlFor="wb-profile">Indicator format</label>
            <select id="wb-profile" className="input" value={settings.profile} onChange={(e) => updateSetting('profile', e.target.value)}>
              {PROFILES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <p className="mt-1 text-xs text-slate-500">Example: <code className="font-mono">{findProfile(settings.profile).example}</code></p>
          </div>
          <div>
            <label className="label" htmlFor="wb-unit">Indicator sends</label>
            <select id="wb-unit" className="input" value={settings.unit} onChange={(e) => updateSetting('unit', e.target.value)}>
              {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="wb-multiplier">Multiply by</label>
            <input id="wb-multiplier" className="input" type="number" step="any" value={settings.multiplier} onChange={(e) => updateSetting('multiplier', e.target.value)} />
            <p className="mt-1 text-xs text-slate-500">Use 10 or 0.1 if the weight is off by a factor of 10.</p>
          </div>
          {settings.profile === 'custom' && (
            <div className="md:col-span-3">
              <label className="label" htmlFor="wb-regex">Custom pattern (the weight must be in the first brackets)</label>
              <input id="wb-regex" className="input font-mono" value={settings.customRegex} onChange={(e) => updateSetting('customRegex', e.target.value)} placeholder="W:\s*(\d+)" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="wb-stablems">Stable for (ms)</label>
            <input id="wb-stablems" className="input" type="number" min="500" step="250" value={settings.stableMs} onChange={(e) => updateSetting('stableMs', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="wb-tolerance">Allowed swing (kg)</label>
            <input id="wb-tolerance" className="input" type="number" min="0" step="5" value={settings.toleranceKg} onChange={(e) => updateSetting('toleranceKg', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="wb-minweight">Empty bridge below (kg)</label>
            <input id="wb-minweight" className="input" type="number" min="0" step="50" value={settings.minWeightKg} onChange={(e) => updateSetting('minWeightKg', e.target.value)} />
          </div>
        </div>
      </section>

      {/* Raw data */}
      <section className="panel">
        <div className="panel-header flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Raw data from the indicator</h2>
            <p className="text-xs text-slate-500">
              {frameCount.total} frames received, {parseRate}% read as a weight
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={() => setShowHex((v) => !v)}>{showHex ? 'Text' : 'Hex'}</button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setPaused((v) => !v)}>
              {paused ? <><Play size={14} /> Resume</> : <><Pause size={14} /> Pause</>}
            </button>
          </div>
        </div>
        <pre className="max-h-64 overflow-auto bg-slate-900 p-3 font-mono text-[11px] leading-5 text-emerald-300 md:text-xs">
          {rawLines.length === 0
            ? <span className="text-slate-500">Nothing yet.</span>
            : rawLines.map(({ at, frame }, i) => (
              <div key={`${at}-${i}`} className="whitespace-pre-wrap break-all">
                <span className="text-slate-500">{new Date(at).toLocaleTimeString('en-IN')} </span>
                {showHex ? hexText(frame) : visibleText(frame)}
              </div>
            ))}
        </pre>
      </section>

      {/* Test weighment */}
      <section className="card space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Scale size={16} /> 3. Test a weighment</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div>
            <label className="label" htmlFor="wb-vehicle">Vehicle number</label>
            <input id="wb-vehicle" className="input uppercase" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="CG04 AB 1234" />
          </div>
          <div>
            <span className="label">Type</span>
            <div className="flex rounded-lg ring-1 ring-slate-300">
              {[{ v: 'sale', l: 'Sale' }, { v: 'boulder', l: 'Boulder' }].map(({ v, l }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDirection(v)}
                  className={`min-h-[2.5rem] px-4 text-sm font-semibold first:rounded-l-lg last:rounded-r-lg ${direction === v ? 'bg-primary-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end">
            <button type="button" className="btn-primary w-full" disabled={!canCapture} onClick={() => captureFirst(false)}>
              <Truck size={16} /> Capture first weight
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          {direction === 'sale'
            ? 'Sale: the empty truck is weighed first (tare), then again when loaded (gross).'
            : 'Boulder: the loaded truck is weighed first (gross), then again when empty (tare).'}
          {' '}The button works only when the weight is stable.
        </p>

        <details className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <summary className="cursor-pointer text-xs font-semibold text-slate-700">Weighbridge not working? Type the weight by hand</summary>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="w-40">
              <label className="label" htmlFor="wb-manual">Weight (kg)</label>
              <input id="wb-manual" className="input" type="number" min="0" value={manualKg} onChange={(e) => setManualKg(e.target.value)} />
            </div>
            <button type="button" className="btn-secondary" onClick={() => captureFirst(true)}>Save as first weight</button>
            <p className="w-full text-xs text-slate-500">Typed weights are marked with * on the slip, so they are never mixed up with weighbridge readings.</p>
          </div>
        </details>
      </section>

      {/* Tickets */}
      <section className="panel">
        <div className="panel-header flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Test tickets</h2>
            <p className="text-xs text-slate-500">{openTickets.length} waiting for second weight · saved in this browser only</p>
          </div>
          {tickets.length > 0 && (
            <button type="button" className="btn-secondary btn-sm" onClick={clearTickets}><Trash2 size={14} /> Clear all</button>
          )}
        </div>
        {tickets.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No test tickets yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr>
                  <th className="tbl-head">RST</th>
                  <th className="tbl-head">Vehicle</th>
                  <th className="tbl-head">Type</th>
                  <th className="tbl-head text-right">First</th>
                  <th className="tbl-head text-right">Second</th>
                  <th className="tbl-head text-right">Net</th>
                  <th className="tbl-head text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="tbl-cell font-semibold">{t.rst}</td>
                    <td className="tbl-cell">{t.vehicleNo}</td>
                    <td className="tbl-cell">{t.direction === 'sale' ? 'Sale' : 'Boulder'}</td>
                    <td className="tbl-cell text-right tabular-nums">
                      {formatKg(t.first.kg)}{t.first.manual && <span title="Typed by hand" className="text-amber-600"> *</span>}
                      <div className="text-[11px] text-slate-400">{formatTime(t.first.at)}</div>
                    </td>
                    <td className="tbl-cell text-right tabular-nums">
                      {t.second ? (
                        <>
                          {formatKg(t.second.kg)}{t.second.manual && <span title="Typed by hand" className="text-amber-600"> *</span>}
                          <div className="text-[11px] text-slate-400">{formatTime(t.second.at)}</div>
                        </>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <button type="button" className="btn-primary btn-sm" disabled={!canCapture} onClick={() => captureSecond(t.id, false)}>Capture</button>
                          {manualKg && <button type="button" className="btn-secondary btn-sm" onClick={() => captureSecond(t.id, true)}>Use typed</button>}
                        </div>
                      )}
                    </td>
                    <td className="tbl-cell text-right font-bold tabular-nums text-emerald-700">{t.second ? formatKg(t.net) : '—'}</td>
                    <td className="tbl-cell">
                      <div className="flex justify-end gap-1">
                        <button type="button" className="icon-btn" title="Print slip" aria-label="Print slip" onClick={() => printSlip(t)}><Printer size={16} /></button>
                        <button type="button" className="icon-btn" title="Delete" aria-label="Delete ticket" onClick={() => deleteTicket(t.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Help */}
      <section className="card text-sm text-slate-700">
        <h2 className="mb-2 text-sm font-bold text-slate-900">How to connect</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Connect the indicator&apos;s RS-232 port to the computer with a USB-to-RS232 cable (FTDI or PL2303). Some indicators need a null-modem (crossed) cable.</li>
          <li>Close any other weighbridge software on this computer — only one program can use the COM port.</li>
          <li>Open this page in Chrome or Edge, press <b>Connect weighbridge</b> and pick the port.</li>
          <li>Watch the raw data. If it shows readable numbers, press <b>Auto-detect format</b> and check that the big weight matches the indicator display.</li>
          <li>Put a truck on, wait for <b>Stable</b>, and capture the first and second weights.</li>
        </ol>
      </section>
    </div>
  );
}
