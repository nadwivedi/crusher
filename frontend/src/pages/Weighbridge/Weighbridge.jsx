import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  AlertTriangle, Cable, CheckCircle2, ChevronDown, FileText, FlaskConical, Monitor, Mountain, Plug, PlugZap,
  Plus, Printer, RefreshCw, Save, Scale, Settings2, Truck, Unplug, Wifi, WifiOff, X
} from 'lucide-react';
import apiClient from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { hasFeatureAccess } from '../../utils/featureAccess';
import { canAddEntries, canUseSection, isStaff } from '../../utils/staffAccess';
import { PROFILES, UNITS, findProfile } from '../../utils/weighbridgeParser';
import useWeighbridgeReader, { serialSupported } from '../../hooks/useWeighbridgeReader';
import Sales from '../Sales/Sales';
import BoulderEntry from '../BoulderEntry/BoulderEntry';

// The kanta screen: live weight, two-step weighing tickets (RST), and turning a ticket into a sale or boulder entry.
// The computer next to the indicator reads it here (Chrome / Edge) and sends the weight to the server;
// every other screen (owner's phone, office) sees the same live weight. Weights are captured on the server.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const DEVICE_KEY = 'cb_weighbridge_device';
const CABIN_KEY = 'cb_weighbridge_cabin';
const LIVE_STALE_MS = 3000;
const POST_EVERY_MS = 500;
const BAUD_RATES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];

const FLAG_LABELS = {
  manual: { label: 'Typed by hand', className: 'badge-red' },
  stored_tare: { label: 'Saved tare', className: 'badge-gray' },
  tare_mismatch: { label: 'Tare differs', className: 'badge-orange' },
  short_stay: { label: 'Quick return', className: 'badge-orange' }
};

const SOURCE_MARK = { manual: ' (typed)', stored: ' (saved tare)' };

const readStored = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeStored = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage blocked: only the remembered choice is lost */
  }
};

const formatKg = (kg) => (kg == null ? '—' : Number(kg).toLocaleString('en-IN', { maximumFractionDigits: 2 }));
const formatTime = (value) => (value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const compactVehicle = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const isToday = (value) => value && new Date(value).toDateString() === new Date().toDateString();

const deviceSettings = (device) => ({
  baudRate: device?.baudRate ?? 9600,
  dataBits: device?.dataBits ?? 8,
  parity: device?.parity ?? 'none',
  stopBits: device?.stopBits ?? 1,
  profile: device?.profile ?? 'avery',
  unit: device?.unit ?? 'kg',
  multiplier: device?.multiplier ?? 1,
  customRegex: device?.customRegex ?? '(\\d+)',
  stableMs: device?.stableMs ?? 2000,
  toleranceKg: device?.toleranceKg ?? 20,
  minWeightKg: device?.minWeightKg ?? 500
});

// Which weighing is gross and which is tare, by ticket type
const stageLabels = (direction) => (direction === 'boulder'
  ? { first: 'Gross (loaded)', second: 'Tare (empty)' }
  : { first: 'Tare (empty)', second: 'Gross (loaded)' });

export default function Weighbridge() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const owner = !isStaff(user);
  const featureOn = hasFeatureAccess(user, 'weighbridge');
  const canAdd = canAddEntries(user);
  const canSale = canUseSection(user, 'sales') && canAdd;
  const canBoulder = canUseSection(user, 'boulder') && canAdd;

  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(() => readStored(DEVICE_KEY) || '');
  const [loadingDevices, setLoadingDevices] = useState(true);
  const device = useMemo(() => devices.find((d) => d._id === deviceId) || devices[0] || null, [devices, deviceId]);
  const settings = useMemo(() => deviceSettings(device), [device]);

  const reader = useWeighbridgeReader(settings, { onError: (message) => toast.error(message) });

  // ---------- Devices ----------

  const loadDevices = useCallback(async () => {
    try {
      const response = await apiClient.get('/weighbridge/devices');
      setDevices(response?.data || []);
    } catch (error) {
      toast.error(error?.message || 'Could not load the weighbridge');
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    if (featureOn) loadDevices();
    else setLoadingDevices(false);
  }, [featureOn, loadDevices]);

  useEffect(() => {
    if (device?._id && device._id !== deviceId) setDeviceId(device._id);
    if (device?._id) writeStored(DEVICE_KEY, device._id);
  }, [device, deviceId]);

  // ---------- Live weight from the server ----------

  const [live, setLive] = useState(null);
  const [streamUp, setStreamUp] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const response = await apiClient.get('/weighbridge/weighments', { params: { limit: 200 } });
      setTickets(response?.data || []);
    } catch (error) {
      toast.error(error?.message || 'Could not load tickets');
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    if (featureOn) loadTickets();
  }, [featureOn, loadTickets]);

  const loadTicketsRef = useRef(loadTickets);
  loadTicketsRef.current = loadTickets;

  useEffect(() => {
    if (!device?._id || typeof EventSource === 'undefined') return undefined;
    const source = new EventSource(`${API_BASE_URL}/weighbridge/live?deviceId=${device._id}`, { withCredentials: true });
    source.onopen = () => setStreamUp(true);
    source.onerror = () => setStreamUp(false);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Freshness goes by when it arrived here, so a different clock on this device does not matter
        if (data.type === 'reading') setLive({ ...data, receivedAt: Date.now() });
        if (data.type === 'tickets') loadTicketsRef.current();
      } catch {
        /* ignore a broken event */
      }
    };
    return () => {
      source.close();
      setStreamUp(false);
      setLive(null);
    };
  }, [device?._id]);

  // ---------- This computer reads the kanta ----------

  const readingRef = useRef(reader.reading);
  readingRef.current = reader.reading;
  const freshRef = useRef(reader.fresh);
  freshRef.current = reader.fresh;

  const sendReading = useCallback(async () => {
    if (!freshRef.current || !device?._id) return;
    const r = readingRef.current;
    await apiClient.post('/weighbridge/readings', { deviceId: device._id, weightKg: r.weightKg, stable: r.stable, overload: r.overload });
  }, [device?._id]);

  // Send the weight to the server while connected, so captures and other screens use it
  useEffect(() => {
    if (!reader.connected || !device?._id) return undefined;
    let busy = false;
    const id = setInterval(async () => {
      if (busy) return;
      busy = true;
      try {
        await sendReading();
      } catch {
        /* the next reading tries again */
      } finally {
        busy = false;
      }
    }, POST_EVERY_MS);
    return () => clearInterval(id);
  }, [reader.connected, device?._id, sendReading]);

  // The server captures its latest reading; on the kanta computer, make that the one on screen now
  const syncBeforeCapture = async (manual) => {
    if (manual || !reader.connected) return;
    try {
      await sendReading();
    } catch {
      /* the server still has the reading from a moment ago */
    }
  };

  // Remember that this computer is the kanta computer, and reconnect the allowed port on the next visit
  const autoConnectTried = useRef(false);
  useEffect(() => {
    if (autoConnectTried.current || !device?._id || !serialSupported) return;
    autoConnectTried.current = true;
    if (readStored(CABIN_KEY) === device._id) reader.connectSerial(false);
  }, [device?._id, reader]);

  const connectSerial = async () => {
    const ok = await reader.connectSerial(true);
    if (ok) {
      writeStored(CABIN_KEY, device?._id || null);
      toast.success('Weighbridge connected. Keep this tab open while weighing.');
    }
  };

  const disconnect = async () => {
    await reader.disconnect();
    writeStored(CABIN_KEY, null);
  };

  // The weight shown: this computer's own reading when it reads the kanta, otherwise the server's live weight
  const localMode = reader.connected;
  const shown = localMode
    ? { ...reader.reading, fresh: reader.fresh }
    : { ...(live || {}), fresh: Boolean(live?.receivedAt) && reader.now - live.receivedAt < LIVE_STALE_MS };
  const minWeight = Number(settings.minWeightKg || 0);
  const aboveMin = shown.weightKg != null && shown.weightKg >= minWeight;
  const canCapture = Boolean(shown.fresh && shown.stable && aboveMin && !shown.overload);

  // ---------- New ticket ----------

  const [vehicles, setVehicles] = useState([]);
  const [vehicleNo, setVehicleNo] = useState('');
  const [direction, setDirection] = useState(canSale || !canBoulder ? 'sale' : 'boulder');
  const [useStoredTare, setUseStoredTare] = useState(false);
  const [manualKg, setManualKg] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [saving, setSaving] = useState('');

  useEffect(() => {
    if (!featureOn) return;
    apiClient.get('/vehicles').then((list) => setVehicles(Array.isArray(list) ? list : [])).catch(() => {});
  }, [featureOn]);

  const typedVehicle = useMemo(() => {
    const typed = compactVehicle(vehicleNo);
    return typed ? vehicles.find((v) => compactVehicle(v.vehicleNo) === typed) || null : null;
  }, [vehicles, vehicleNo]);
  const storedTare = Number(typedVehicle?.lastTareKg || 0);
  useEffect(() => {
    if (!storedTare) setUseStoredTare(false);
  }, [storedTare]);

  const openTickets = useMemo(() => tickets.filter((t) => t.status === 'open'), [tickets]);
  const readyTickets = useMemo(() => tickets.filter((t) => t.status === 'closed'), [tickets]);
  const doneToday = useMemo(() => tickets.filter((t) => (t.status === 'used' || t.status === 'cancelled') && isToday(t.updatedAt)), [tickets]);

  const manualPayload = (manual) => (manual ? { manualWeightKg: manualKg, reason: manualReason } : {});

  const showResult = (response, message) => {
    toast.success(message);
    if (response?.warning) toast.warn(response.warning, { autoClose: 6000 });
  };

  const captureFirst = async (manual = false) => {
    const vehicle = vehicleNo.trim().toUpperCase();
    if (!vehicle) {
      toast.error('Enter the vehicle number');
      return;
    }
    setSaving('first');
    try {
      await syncBeforeCapture(manual);
      const response = await apiClient.post('/weighbridge/weighments', {
        deviceId: device?._id,
        vehicleNo: vehicle,
        direction,
        useStoredTare: useStoredTare && !manual,
        ...manualPayload(manual)
      });
      const t = response.data;
      showResult(response, t.status === 'closed'
        ? `RST ${t.rstNo}: net ${formatKg(t.netKg)} kg`
        : `RST ${t.rstNo}: first weight ${formatKg(t.first.weightKg)} kg saved`);
      setVehicleNo('');
      setUseStoredTare(false);
      setManualKg('');
      setManualReason('');
      loadTickets();
    } catch (error) {
      toast.error(error?.message || 'Could not save the weight');
    } finally {
      setSaving('');
    }
  };

  const captureSecond = async (ticket, manual = false) => {
    setSaving(ticket._id);
    try {
      await syncBeforeCapture(manual);
      const response = await apiClient.post(`/weighbridge/weighments/${ticket._id}/second`, {
        deviceId: device?._id,
        ...manualPayload(manual)
      });
      showResult(response, `RST ${ticket.rstNo}: net ${formatKg(response.data.netKg)} kg`);
      setManualKg('');
      setManualReason('');
      loadTickets();
    } catch (error) {
      toast.error(error?.message || 'Could not save the second weight');
    } finally {
      setSaving('');
    }
  };

  const cancelTicket = async (ticket) => {
    const reason = window.prompt(`Cancel RST ${ticket.rstNo} (${ticket.vehicleNo})? Write the reason:`);
    if (reason === null) return;
    try {
      await apiClient.post(`/weighbridge/weighments/${ticket._id}/cancel`, { reason });
      toast.success(`RST ${ticket.rstNo} cancelled`);
      loadTickets();
    } catch (error) {
      toast.error(error?.message || 'Could not cancel the ticket');
    }
  };

  // ---------- Sale / boulder entry from a ticket ----------

  const [entryFor, setEntryFor] = useState(null);
  const finishEntry = () => {
    setEntryFor(null);
    loadTickets();
  };

  // ---------- Slip ----------

  const printSlip = (t) => {
    const win = window.open('', '_blank', 'width=420,height=640');
    if (!win) {
      toast.error('Allow pop-ups to print the slip');
      return;
    }
    const labels = stageLabels(t.direction);
    const row = (label, value) => `<tr><td>${escapeHtml(label)}</td><td style="text-align:right"><b>${escapeHtml(value)}</b></td></tr>`;
    const mark = (capture) => (capture?.source && capture.source !== 'device' ? ' *' : '');
    const company = user?.role === 'employee' ? user?.ownerName : user?.name;
    win.document.write(`<!doctype html><html><head><title>RST ${t.rstNo}</title>
      <style>body{font-family:monospace;padding:16px;font-size:13px}table{width:100%;border-collapse:collapse}td{padding:4px 0;border-bottom:1px dashed #999}h2{margin:0 0 4px;text-align:center}p{text-align:center;margin:0 0 12px}.net td{font-size:16px;border-bottom:2px solid #000}</style>
      </head><body>
      <h2>${escapeHtml(company || 'CrusherBook')}</h2>
      <p>Weighbridge slip${device?.name ? ` · ${escapeHtml(device.name)}` : ''}</p>
      <table>
        ${row('RST No', t.rstNo)}
        ${row('Vehicle', t.vehicleNo)}
        ${row('Type', t.direction === 'boulder' ? 'Boulder (in)' : 'Sale (out)')}
        ${row(`${labels.first}${mark(t.first)}`, `${formatKg(t.first?.weightKg)} kg`)}
        ${row('Time', formatTime(t.first?.at))}
        ${t.second ? row(`${labels.second}${mark(t.second)}`, `${formatKg(t.second.weightKg)} kg`) : ''}
        ${t.second ? row('Time', formatTime(t.second.at)) : ''}
        ${t.second ? `<tr class="net"><td>NET</td><td style="text-align:right"><b>${escapeHtml(formatKg(t.netKg))} kg</b></td></tr>` : ''}
      </table>
      ${(mark(t.first) || mark(t.second)) ? '<p style="margin-top:8px">* not read from the weighbridge (typed or saved tare)</p>' : ''}
      <script>window.onload=()=>{window.print()}</script></body></html>`);
    win.document.close();
  };

  // ---------- Settings (owner) ----------

  const [showSettings, setShowSettings] = useState(false);
  const [draft, setDraft] = useState(null);
  useEffect(() => {
    if (device) setDraft({ name: device.name, tareAlertKg: device.tareAlertKg ?? 300, ...deviceSettings(device) });
  }, [device]);

  const updateDraft = (name, value) => setDraft((prev) => ({ ...prev, [name]: value }));

  const saveSettings = async () => {
    if (!device || !draft) return;
    setSaving('settings');
    try {
      const response = await apiClient.put(`/weighbridge/devices/${device._id}`, draft);
      setDevices((prev) => prev.map((d) => (d._id === device._id ? { ...d, ...response.data } : d)));
      reader.resetStability();
      const portChanged = ['baudRate', 'dataBits', 'parity', 'stopBits'].some((k) => String(draft[k]) !== String(device[k]));
      toast.success('Weighbridge settings saved');
      if (portChanged && reader.source === 'serial') {
        // The saved settings reach the reader on the next render; reopen after that
        setTimeout(() => reader.reopenSerial(), 0);
      }
    } catch (error) {
      toast.error(error?.message || 'Could not save the settings');
    } finally {
      setSaving('');
    }
  };

  const addDevice = async () => {
    try {
      const response = await apiClient.post('/weighbridge/devices', {});
      setDevices((prev) => [...prev, response.data]);
      setDeviceId(response.data._id);
      setShowSettings(true);
      toast.success(`${response.data.name} added`);
    } catch (error) {
      toast.error(error?.message || 'Could not add a weighbridge');
    }
  };

  // ---------- Render ----------

  if (!featureOn) {
    return (
      <div className="page-fade-in max-w-3xl space-y-4 px-3 pb-8 pt-4 lg:px-6 lg:pt-5">
        <h1 className="page-title">Weighbridge</h1>
        <section className="card flex gap-3">
          <Scale size={22} className="mt-0.5 shrink-0 text-primary-600" />
          <div className="text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Weighbridge integration is part of the Enterprise plan.</p>
            <p className="mt-1">Read the weight straight from your kanta indicator, stop typed weights, and turn each RST into a sale or boulder entry in one click. Call or WhatsApp CrusherBook to switch it on, and tell us your indicator make and model.</p>
          </div>
        </section>
      </div>
    );
  }

  const weightTone = !shown.fresh
    ? 'text-slate-300'
    : shown.overload
      ? 'text-rose-600'
      : shown.stable
        ? 'text-emerald-600'
        : 'text-amber-500';
  const liveFromOther = !localMode && shown.fresh;

  return (
    <div className="page-fade-in max-w-6xl space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-title">Weighbridge</h1>
          <p className="page-subtitle">Weigh the vehicle, then make the sale or boulder entry from its RST. Weights come from the kanta, not typed.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {devices.length > 1 && (
            <select className="input w-auto" value={device?._id || ''} onChange={(e) => setDeviceId(e.target.value)} aria-label="Weighbridge">
              {devices.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          )}
          <button type="button" className="icon-btn" onClick={loadTickets} title="Reload tickets" aria-label="Reload tickets">
            <RefreshCw size={16} className={loadingTickets ? 'animate-spin' : ''} />
          </button>
          {owner && (
            <button type="button" className="btn-secondary btn-sm" onClick={() => setShowSettings((v) => !v)}>
              <Settings2 size={14} /> Settings
            </button>
          )}
        </div>
      </div>

      {loadingDevices && <p className="text-sm text-slate-500">Loading…</p>}
      {!loadingDevices && !device && (
        <section className="card text-sm text-slate-600">No weighbridge set up yet. Ask the owner to open this page once.</section>
      )}

      {device && (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          {/* Live weight */}
          <section className="card flex flex-col items-center justify-center gap-3 py-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{device.name} · live weight</p>
            <div className={`font-mono text-5xl font-extrabold tabular-nums transition-colors md:text-7xl ${weightTone}`}>
              {shown.overload && shown.fresh ? 'OVERLOAD' : formatKg(shown.fresh ? shown.weightKg : null)}
              {!(shown.overload && shown.fresh) && <span className="ml-2 text-xl font-bold md:text-3xl">kg</span>}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {shown.fresh && shown.weightKg != null && (shown.stable
                ? <span className="badge-green"><CheckCircle2 size={12} className="mr-1" /> Stable</span>
                : <span className="badge-orange">Moving…</span>)}
              {shown.fresh && shown.weightKg != null && !aboveMin && <span className="badge-gray">Below {formatKg(minWeight)} kg: bridge empty</span>}
              {localMode && reader.noData && <span className="badge-red">No data from indicator — check cable and baud rate</span>}
              {!localMode && !shown.fresh && (
                <span className="badge-gray"><WifiOff size={12} className="mr-1" /> Kanta computer not sending</span>
              )}
              {liveFromOther && (
                <span className="badge-gray"><Wifi size={12} className="mr-1" /> From the kanta computer{live?.by ? ` (${live.by})` : ''}</span>
              )}
              {!streamUp && <span className="badge-gray">Reconnecting to server…</span>}
            </div>
          </section>

          {/* Kanta computer */}
          <section className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Monitor size={16} /> This computer reads the kanta</h2>
              {reader.connected ? <span className="badge-green">{reader.portLabel}</span> : <span className="badge-gray">Not connected</span>}
            </div>
            {!serialSupported ? (
              <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
                <AlertTriangle size={16} className="shrink-0" />
                <span>To read the indicator, open this page in <b>Chrome</b> or <b>Edge</b> on the computer wired to the kanta. On this device you can still see the live weight and capture tickets.</span>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Do this only on the computer wired to the indicator (USB-to-RS232 cable). Keep this tab open while weighing; it reconnects by itself next time.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {!reader.connected ? (
                <>
                  <button type="button" className="btn-primary" disabled={!serialSupported || reader.connecting} onClick={connectSerial}>
                    <Plug size={16} /> {reader.connecting ? 'Connecting…' : 'Connect weighbridge'}
                  </button>
                  {serialSupported && (
                    <button type="button" className="btn-secondary" disabled={reader.connecting} onClick={() => reader.connectSerial(false).then((ok) => { if (ok) writeStored(CABIN_KEY, device._id); else toast.info('No saved port. Use Connect weighbridge.'); })}>
                      <PlugZap size={16} /> Reconnect
                    </button>
                  )}
                  {owner && (
                    <button type="button" className="btn-secondary" onClick={reader.startSimulator}>
                      <FlaskConical size={16} /> Simulator
                    </button>
                  )}
                </>
              ) : (
                <button type="button" className="btn-secondary" onClick={disconnect}>
                  <Unplug size={16} /> Disconnect
                </button>
              )}
            </div>
            {reader.source === 'simulator' && (
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="mb-2 text-xs font-semibold text-slate-700">Simulator (test only): put a truck on the bridge</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary btn-sm" onClick={() => reader.setSimWeight(0)}>Empty bridge</button>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => reader.setSimWeight(8000 + Math.round(Math.random() * 40) * 50)}>Empty truck</button>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => reader.setSimWeight(30000 + Math.round(Math.random() * 200) * 50)}>Loaded truck</button>
                </div>
              </div>
            )}
            {owner && (
              <button type="button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:underline" onClick={() => navigate('/settings/weighbridge')}>
                <Cable size={13} /> Setting up a new indicator? Open the test page (raw data, auto-detect format)
              </button>
            )}
          </section>
        </div>
      )}

      {/* Settings */}
      {device && owner && showSettings && draft && (
        <section className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Settings2 size={16} /> {device.name} settings</h2>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary btn-sm" onClick={addDevice}><Plus size={14} /> Add another kanta</button>
              <button type="button" className="icon-btn" onClick={() => setShowSettings(false)} aria-label="Close settings"><X size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="col-span-2">
              <label className="label" htmlFor="wbs-name">Name</label>
              <input id="wbs-name" className="input" value={draft.name} onChange={(e) => updateDraft('name', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="wbs-profile">Indicator format</label>
              <select id="wbs-profile" className="input" value={draft.profile} onChange={(e) => updateDraft('profile', e.target.value)}>
                {PROFILES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="wbs-unit">Indicator sends</label>
              <select id="wbs-unit" className="input" value={draft.unit} onChange={(e) => updateDraft('unit', e.target.value)}>
                {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            {draft.profile === 'custom' && (
              <div className="col-span-2 md:col-span-4">
                <label className="label" htmlFor="wbs-regex">Custom pattern (weight in the first brackets)</label>
                <input id="wbs-regex" className="input font-mono" value={draft.customRegex} onChange={(e) => updateDraft('customRegex', e.target.value)} />
              </div>
            )}
            <p className="col-span-2 -mt-1 text-xs text-slate-500 md:col-span-4">Example of this format: <code className="font-mono">{findProfile(draft.profile).example}</code></p>
            <div>
              <label className="label" htmlFor="wbs-baud">Baud rate</label>
              <select id="wbs-baud" className="input" value={draft.baudRate} onChange={(e) => updateDraft('baudRate', Number(e.target.value))}>
                {BAUD_RATES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="wbs-databits">Data bits</label>
              <select id="wbs-databits" className="input" value={draft.dataBits} onChange={(e) => updateDraft('dataBits', Number(e.target.value))}>
                <option value={8}>8</option>
                <option value={7}>7</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="wbs-parity">Parity</label>
              <select id="wbs-parity" className="input" value={draft.parity} onChange={(e) => updateDraft('parity', e.target.value)}>
                <option value="none">None</option>
                <option value="even">Even</option>
                <option value="odd">Odd</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="wbs-stopbits">Stop bits</label>
              <select id="wbs-stopbits" className="input" value={draft.stopBits} onChange={(e) => updateDraft('stopBits', Number(e.target.value))}>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="wbs-multiplier">Multiply by</label>
              <input id="wbs-multiplier" className="input" type="number" step="any" value={draft.multiplier} onChange={(e) => updateDraft('multiplier', Number(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="wbs-stablems">Stable for (ms)</label>
              <input id="wbs-stablems" className="input" type="number" min="500" step="250" value={draft.stableMs} onChange={(e) => updateDraft('stableMs', Number(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="wbs-tolerance">Allowed swing (kg)</label>
              <input id="wbs-tolerance" className="input" type="number" min="0" step="5" value={draft.toleranceKg} onChange={(e) => updateDraft('toleranceKg', Number(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="wbs-min">Empty bridge below (kg)</label>
              <input id="wbs-min" className="input" type="number" min="0" step="50" value={draft.minWeightKg} onChange={(e) => updateDraft('minWeightKg', Number(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="wbs-tarealert">Warn if tare differs by (kg)</label>
              <input id="wbs-tarealert" className="input" type="number" min="0" step="50" value={draft.tareAlertKg} onChange={(e) => updateDraft('tareAlertKg', Number(e.target.value))} />
            </div>
          </div>
          <button type="button" className="btn-primary" disabled={saving === 'settings'} onClick={saveSettings}>
            <Save size={16} /> {saving === 'settings' ? 'Saving…' : 'Save settings'}
          </button>
        </section>
      )}

      {/* New weighing */}
      {device && canAdd && (
        <section className="card space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Truck size={16} /> New weighing</h2>
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div>
              <label className="label" htmlFor="wb-vehicle">Vehicle number</label>
              <input id="wb-vehicle" className="input uppercase placeholder:normal-case" list="wb-vehicle-options" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value.toUpperCase())} placeholder="CG04 AB 1234" autoComplete="off" />
              <datalist id="wb-vehicle-options">
                {vehicles.map((v) => <option key={v._id} value={v.vehicleNo} />)}
              </datalist>
            </div>
            <div>
              <span className="label">Type</span>
              <div className="flex rounded-lg ring-1 ring-slate-300">
                {[{ v: 'sale', l: 'Sale (out)', ok: canSale }, { v: 'boulder', l: 'Boulder (in)', ok: canBoulder }].filter((o) => o.ok).map(({ v, l }) => (
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
              <button type="button" className="btn-primary w-full" disabled={!canCapture || saving === 'first'} onClick={() => captureFirst(false)}>
                <Scale size={16} /> {saving === 'first' ? 'Saving…' : useStoredTare ? 'Capture weight' : 'Capture first weight'}
              </button>
            </div>
          </div>
          {storedTare > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={useStoredTare} onChange={(e) => setUseStoredTare(e.target.checked)} />
              Single weighing: use saved tare <b>{formatKg(storedTare)} kg</b>
              {typedVehicle?.lastTareAt && <span className="text-xs text-slate-400">({formatTime(typedVehicle.lastTareAt)})</span>}
            </label>
          )}
          <p className="text-xs text-slate-500">
            {direction === 'sale'
              ? 'Sale: weigh the empty truck now (tare), and again when loaded (gross).'
              : 'Boulder: weigh the loaded truck now (gross), and again when empty (tare).'}
            {' '}Capture works only when the weight is stable.
          </p>
          {owner && (
            <details className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <summary className="cursor-pointer text-xs font-semibold text-slate-700">Kanta not working? Type the weight by hand (owner only, marked on the ticket)</summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
                <div>
                  <label className="label" htmlFor="wb-manual">Weight (kg)</label>
                  <input id="wb-manual" className="input" type="number" min="0" value={manualKg} onChange={(e) => setManualKg(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="wb-reason">Reason</label>
                  <input id="wb-reason" className="input" value={manualReason} onChange={(e) => setManualReason(e.target.value)} placeholder="Indicator off, power cut…" />
                </div>
                <div className="flex items-end">
                  <button type="button" className="btn-secondary w-full" disabled={saving === 'first'} onClick={() => captureFirst(true)}>Save as first weight</button>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">For a ticket waiting below, fill these in and press <b>Use typed</b> on it.</p>
            </details>
          )}
        </section>
      )}

      {/* Waiting for second weight */}
      <TicketTable
        title="Waiting for second weight"
        empty="No vehicle is waiting."
        tickets={openTickets}
        renderActions={(t) => (
          <>
            {canAdd && (
              <button type="button" className="btn-primary btn-sm" disabled={!canCapture || saving === t._id} onClick={() => captureSecond(t, false)}>
                {saving === t._id ? 'Saving…' : 'Capture second'}
              </button>
            )}
            {owner && manualKg && (
              <button type="button" className="btn-secondary btn-sm" disabled={saving === t._id} onClick={() => captureSecond(t, true)}>Use typed</button>
            )}
            <button type="button" className="icon-btn" title="Print slip" aria-label="Print slip" onClick={() => printSlip(t)}><Printer size={16} /></button>
            <button type="button" className="icon-btn" title="Cancel ticket" aria-label="Cancel ticket" onClick={() => cancelTicket(t)}><X size={16} /></button>
          </>
        )}
      />

      {/* Ready for entry */}
      <TicketTable
        title="Ready: make the entry"
        empty="No weighed vehicle waiting for an entry."
        tickets={readyTickets}
        renderActions={(t) => (
          <>
            {t.direction === 'sale' && canSale && (
              <button type="button" className="btn-primary btn-sm" onClick={() => setEntryFor(t)}><FileText size={14} /> Make sale</button>
            )}
            {t.direction === 'boulder' && canBoulder && (
              <button type="button" className="btn-primary btn-sm" onClick={() => setEntryFor(t)}><Mountain size={14} /> Make boulder entry</button>
            )}
            <button type="button" className="icon-btn" title="Print slip" aria-label="Print slip" onClick={() => printSlip(t)}><Printer size={16} /></button>
            {owner && <button type="button" className="icon-btn" title="Cancel ticket" aria-label="Cancel ticket" onClick={() => cancelTicket(t)}><X size={16} /></button>}
          </>
        )}
      />

      {/* Done today */}
      {doneToday.length > 0 && (
        <TicketTable
          title="Done today"
          collapsible
          tickets={doneToday}
          renderActions={(t) => (
            <>
              {t.status === 'used'
                ? <span className="badge-green">{t.linkedSaleId ? 'Sale made' : 'Boulder entry made'}</span>
                : <span className="badge-gray" title={t.cancelReason || ''}>Cancelled</span>}
              <button type="button" className="icon-btn" title="Print slip" aria-label="Print slip" onClick={() => printSlip(t)}><Printer size={16} /></button>
            </>
          )}
        />
      )}

      {entryFor?.direction === 'sale' && (
        <Sales modalOnly weighment={entryFor} onModalFinish={finishEntry} />
      )}
      {entryFor?.direction === 'boulder' && (
        <BoulderEntry weighment={entryFor} onModalFinish={finishEntry} />
      )}
    </div>
  );
}

function TicketTable({ title, empty, tickets, renderActions, collapsible = false }) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <section className="panel">
      <button
        type="button"
        className="panel-header flex w-full items-center justify-between gap-2 text-left"
        onClick={() => collapsible && setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h2 className="text-sm font-bold text-slate-900">{title} <span className="ml-1 text-slate-400">{tickets.length}</span></h2>
        {collapsible && <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && (tickets.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
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
              {tickets.map((t) => {
                const labels = stageLabels(t.direction);
                return (
                  <tr key={t._id}>
                    <td className="tbl-cell font-semibold">{t.rstNo}</td>
                    <td className="tbl-cell">
                      <div className="font-semibold">{t.vehicleNo}</div>
                      {t.flags?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {t.flags.map((f) => <span key={f} className={`${FLAG_LABELS[f]?.className || 'badge-gray'} text-[10px]`}>{FLAG_LABELS[f]?.label || f}</span>)}
                        </div>
                      )}
                    </td>
                    <td className="tbl-cell">{t.direction === 'boulder' ? 'Boulder' : 'Sale'}</td>
                    <td className="tbl-cell text-right tabular-nums">
                      {formatKg(t.first?.weightKg)}<span className="text-amber-600">{SOURCE_MARK[t.first?.source] || ''}</span>
                      <div className="text-[11px] text-slate-400">{labels.first} · {formatTime(t.first?.at)}</div>
                    </td>
                    <td className="tbl-cell text-right tabular-nums">
                      {t.second ? (
                        <>
                          {formatKg(t.second.weightKg)}<span className="text-amber-600">{SOURCE_MARK[t.second.source] || ''}</span>
                          <div className="text-[11px] text-slate-400">{labels.second} · {formatTime(t.second.at)}</div>
                        </>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="tbl-cell text-right font-bold tabular-nums text-emerald-700">{t.second ? formatKg(t.netKg) : '—'}</td>
                    <td className="tbl-cell">
                      <div className="flex items-center justify-end gap-1">{renderActions(t)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}
