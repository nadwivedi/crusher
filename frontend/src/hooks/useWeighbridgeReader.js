import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createFrameSplitter, createStabilityTracker, describePort, formatFrame, parseFrame
} from '../utils/weighbridgeParser';

// Reads the weighbridge indicator in this browser: a COM port through Web Serial (Chrome / Edge on a computer),
// or the simulator for trying it without a weighbridge. Gives the live weight and whether it is stable.

export const serialSupported = typeof navigator !== 'undefined' && 'serial' in navigator;

const NO_DATA_MS = 3000;
const EMPTY_READING = { weightKg: null, stable: false, overload: false, at: 0 };

export default function useWeighbridgeReader(settings, { onFrame, onError } = {}) {
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // source: null | 'serial' | 'simulator'
  const [source, setSource] = useState(null);
  const [portLabel, setPortLabel] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [reading, setReading] = useState(EMPTY_READING);
  const [lastFrameAt, setLastFrameAt] = useState(0);
  const [connectedAt, setConnectedAt] = useState(0);
  const [now, setNow] = useState(Date.now());

  const portRef = useRef(null);
  const readerRef = useRef(null);
  const pipeRef = useRef(null);
  const keepReadingRef = useRef(false);
  const simTimerRef = useRef(null);
  const simStateRef = useRef({ target: 0, current: 0 });
  const trackerRef = useRef(createStabilityTracker());
  const lastFrameAtRef = useRef(0);

  const handleFrame = useCallback((frame) => {
    const at = Date.now();
    onFrameRef.current?.(frame, at);
    // Frames come many times a second; the "data arriving" time only needs to be roughly right
    if (at - lastFrameAtRef.current > 250) {
      lastFrameAtRef.current = at;
      setLastFrameAt(at);
    }
    const parsed = parseFrame(frame, settingsRef.current);
    if (!parsed) return;
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

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const resetReadings = useCallback(() => {
    splitterRef.current.reset();
    trackerRef.current.reset();
    lastFrameAtRef.current = 0;
    setReading(EMPTY_READING);
    setLastFrameAt(0);
    setConnectedAt(Date.now());
  }, []);

  // The format or stability settings changed: start judging stability again
  const resetStability = useCallback(() => trackerRef.current.reset(), []);

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
        if (keepReadingRef.current) onErrorRef.current?.(`Read error: ${error.message}`);
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

  const closeSerial = async () => {
    keepReadingRef.current = false;
    try { await readerRef.current?.cancel(); } catch { /* already closed */ }
    try { await pipeRef.current; } catch { /* ignore */ }
    try { await portRef.current?.close(); } catch { /* ignore */ }
    portRef.current = null;
    readerRef.current = null;
  };

  // askForPort false: reuse a port this site was allowed before, without the picker
  const connectSerial = async (askForPort = true) => {
    if (!serialSupported) return false;
    setConnecting(true);
    try {
      let port = null;
      if (!askForPort) {
        const ports = await navigator.serial.getPorts();
        port = ports[0] || null;
        if (!port) return false;
      }
      if (!port) port = await navigator.serial.requestPort();
      await openPort(port);
      return true;
    } catch (error) {
      if (error?.name === 'NotFoundError') return false; // port picker closed
      onErrorRef.current?.(error?.name === 'InvalidStateError'
        ? 'This port is already open in another program or tab. Close the other weighbridge software and try again.'
        : `Could not open the port: ${error?.message || error}`);
      return false;
    } finally {
      setConnecting(false);
    }
  };

  // Port settings only apply when the port opens, so reopen it
  const reopenSerial = async () => {
    if (source !== 'serial' || !portRef.current) return false;
    const port = portRef.current;
    await closeSerial();
    try {
      await openPort(port);
      return true;
    } catch (error) {
      onErrorRef.current?.(`Could not reopen the port: ${error?.message || error}`);
      setSource(null);
      return false;
    }
  };

  // ---------- Simulator ----------

  const stopSimulator = () => {
    clearInterval(simTimerRef.current);
    simTimerRef.current = null;
  };

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

  const setSimWeight = (kg) => {
    simStateRef.current.target = kg;
  };

  const disconnect = async () => {
    if (source === 'serial') await closeSerial();
    if (source === 'simulator') stopSimulator();
    setSource(null);
    setPortLabel('');
    setReading(EMPTY_READING);
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
        setReading(EMPTY_READING);
        onErrorRef.current?.('Weighbridge cable disconnected');
      }
    };
    navigator.serial.addEventListener('disconnect', onDisconnect);
    return () => navigator.serial.removeEventListener('disconnect', onDisconnect);
  }, []);

  const connected = Boolean(source);
  const noData = connected && now - (lastFrameAt || connectedAt) > NO_DATA_MS;
  const fresh = connected && reading.at > 0 && now - reading.at < NO_DATA_MS;

  return {
    source,
    connected,
    connecting,
    portLabel,
    reading,
    fresh,
    noData,
    now,
    connectSerial,
    reopenSerial,
    startSimulator,
    setSimWeight,
    disconnect,
    resetReadings,
    resetStability
  };
}
