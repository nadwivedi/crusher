import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Camera, Check, ChevronDown, Eye, Loader2, Scale, Truck, Upload, X, CalendarDays, Building2 } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import { handlePopupFormKeyDown } from '../../utils/popupFormKeyboard';
import { useFloatingDropdownPosition } from '../../utils/useFloatingDropdownPosition';
import { getSmartVehicleMatch, normalizeVehicleValue } from '../../utils/vehicleMatching';
import DocumentScannerPreview from '../../components/DocumentScannerPreview';
import AddVehiclePopup from '../Vehicle/component/AddVehiclePopup';

const isCompleteVehicleNumber = (value) => normalizeVehicleValue(value).length >= 9;

const formatDateForInput = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTimeForInput = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
};

const initialFormData = {
  vehicleId: '',
  partyId: '',
  vehicleNo: '',
  partyName: '',
  boulderDate: formatDateForInput(),
  entryTime: '',
  exitTime: '',
  tareWeight: '',
  grossWeight: '',
  netWeight: '',
  slipImg: ''
};

const sortVehiclesByTypePreference = (vehicles, preferredType) => [...vehicles].sort((a, b) => {
  const aPreferred = a?.vehicleType === preferredType ? 0 : 1;
  const bPreferred = b?.vehicleType === preferredType ? 0 : 1;
  if (aPreferred !== bPreferred) return aPreferred - bPreferred;

  return String(a?.vehicleNo || a?.vehicleNumber || '').localeCompare(String(a?.vehicleNo || a?.vehicleNumber || ''));
});

export default function BoulderEntry({ onModalFinish = null, editingEntry = null }) {
  const [formData, setFormData] = useState(initialFormData);
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [parties, setParties] = useState([]);
  const [partyQuery, setPartyQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrMode, setOcrMode] = useState('');
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [isVehicleSectionActive, setIsVehicleSectionActive] = useState(false);
  const [isPartySectionActive, setIsPartySectionActive] = useState(false);
  const [vehicleListIndex, setVehicleListIndex] = useState(-1);
  const [partyListIndex, setPartyListIndex] = useState(-1);
  const [scannerState, setScannerState] = useState(null);
  const [ocrVehicleMismatch, setOcrVehicleMismatch] = useState(null);
  const vehicleSectionRef = useRef(null);
  const vehicleInputRef = useRef(null);
  const partySectionRef = useRef(null);
  const partyInputRef = useRef(null);
  const dateInputRef = useRef(null);
  const ocrFileInputRef = useRef(null);
  const ocrCameraInputRef = useRef(null);
  const inputClass = 'w-full rounded-lg border border-slate-400 bg-white px-2.5 py-1.5 text-[13px] text-gray-800 transition placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2';
  const labelClass = 'mb-1 block text-[11px] font-semibold text-gray-700 md:text-xs';
  
  const getVehicleDisplayName = (vehicle) => String(vehicle?.vehicleNumber || vehicle?.vehicleNo || '').trim();
  const getPartyDisplayName = (party) => String(party?.partyName || party?.name || '').trim();
  const getVehiclePartyId = (vehicle) => (
    typeof vehicle?.partyId === 'object'
      ? vehicle?.partyId?._id || ''
      : vehicle?.partyId || ''
  );
  const isEditing = Boolean(editingEntry?._id);

  const selectedParty = useMemo(() => {
    const normalizedPartyName = String(formData.partyName || '').trim().toLowerCase();
    if (!normalizedPartyName) return null;

    return parties.find((party) => (
      String(party?.partyName || party?.name || '').trim().toLowerCase() === normalizedPartyName
    )) || null;
  }, [formData.partyName, parties]);

  const boulderRatePerTon = useMemo(() => {
    if (selectedParty?.type !== 'supplier') return 0;
    const rate = Number(selectedParty?.boulderRatePerTon || 0);
    return Number.isFinite(rate) ? rate : 0;
  }, [selectedParty]);

  const boulderTotalAmount = useMemo(() => {
    const netWeight = Number(formData.netWeight || 0);
    if (!Number.isFinite(netWeight) || netWeight <= 0) return 0;
    return (netWeight / 1000) * boulderRatePerTon;
  }, [boulderRatePerTon, formData.netWeight]);

  useEffect(() => {
    fetchVehicles();
    fetchParties();
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      dateInputRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (!editingEntry?._id) {
      setFormData(initialFormData);
      setVehicleQuery('');
      setPartyQuery('');
      return;
    }

    const vehicleId = typeof editingEntry.vehicleId === 'object'
      ? editingEntry.vehicleId?._id || ''
      : editingEntry.vehicleId || '';
    const vehicleNo = getVehicleDisplayName(editingEntry.vehicleId) || editingEntry.vehicleNo || '';

    setFormData({
      vehicleId,
      partyId: editingEntry.partyId || '',
      vehicleNo,
      partyName: editingEntry.partyName || '',
      boulderDate: formatDateForInput(editingEntry.boulderDate || editingEntry.createdAt),
      entryTime: editingEntry.entryTime || formatTimeForInput(editingEntry.boulderDate || editingEntry.createdAt),
      exitTime: editingEntry.exitTime || '',
      tareWeight: editingEntry.tareWeight === 0 ? '0' : String(editingEntry.tareWeight || ''),
      grossWeight: editingEntry.grossWeight === 0 ? '0' : String(editingEntry.grossWeight || ''),
      netWeight: editingEntry.netWeight === 0 ? '0' : String(editingEntry.netWeight || ''),
      slipImg: editingEntry.slipImg || ''
    });
    setVehicleQuery(vehicleNo);
    setPartyQuery(editingEntry.partyName || '');
  }, [editingEntry]);

  const filteredVehicles = useMemo(() => {
    const search = vehicleQuery.trim().toLowerCase();
    if (!search) return vehicles;
    const exactMatch = vehicles.find((vehicle) => (
      normalizeVehicleValue(getVehicleDisplayName(vehicle)) === normalizeVehicleValue(search)
    ));

    if (isCompleteVehicleNumber(search) && !exactMatch) {
      return [];
    }

    return vehicles.filter((vehicle) => getVehicleDisplayName(vehicle).toLowerCase().includes(search));
  }, [vehicles, vehicleQuery]);

  const filteredParties = useMemo(() => {
    const search = partyQuery.trim().toLowerCase();
    const selectedPartyName = String(formData.partyName || '').trim().toLowerCase();
    if (isPartySectionActive && search && search === selectedPartyName) {
      return parties;
    }
    if (!search) return parties;
    return parties.filter((party) => String(party?.partyName || party?.name || '').trim().toLowerCase().includes(search));
  }, [parties, partyQuery, formData.partyName, isPartySectionActive]);

  useEffect(() => {
    setVehicleListIndex(filteredVehicles.length > 0 ? 0 : -1);
  }, [filteredVehicles]);

  useEffect(() => {
    if (filteredParties.length === 0) {
      setPartyListIndex(-1);
      return;
    }

    const selectedPartyName = String(formData.partyName || '').trim().toLowerCase();
    const typedPartyName = String(partyQuery || '').trim().toLowerCase();
    const shouldHighlightSelectedParty = (
      isPartySectionActive
      && typedPartyName
      && typedPartyName === selectedPartyName
      && selectedPartyName
    );

    if (shouldHighlightSelectedParty) {
      const selectedIndex = filteredParties.findIndex((party) => (
        String(party?.partyName || party?.name || '').trim().toLowerCase() === selectedPartyName
      ));
      setPartyListIndex(selectedIndex >= 0 ? selectedIndex : 0);
      return;
    }

    setPartyListIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= filteredParties.length) return filteredParties.length - 1;
      return prev;
    });
  }, [filteredParties, formData.partyName, isPartySectionActive, partyQuery]);

  const vehicleDropdownStyle = useFloatingDropdownPosition(
    vehicleSectionRef,
    isVehicleSectionActive,
    [filteredVehicles.length, vehicleListIndex]
  );

  const partyDropdownStyle = useFloatingDropdownPosition(
    partySectionRef,
    isPartySectionActive,
    [filteredParties.length, partyListIndex]
  );

  const fetchVehicles = async () => {
    try {
      const response = await apiClient.get('/vehicles');
      const vehicleList = Array.isArray(response) ? response : [];
      setVehicles(sortVehiclesByTypePreference(vehicleList, 'boulder'));
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const fetchParties = async () => {
    try {
      const response = await apiClient.get('/parties');
      setParties(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching parties:', error);
    }
  };

  const updateWeights = (nextValues) => {
    const tareWeight = parseFloat(nextValues.tareWeight) || 0;
    const grossWeight = parseFloat(nextValues.grossWeight) || 0;
    const netWeight = grossWeight > 0 && tareWeight > 0 ? Math.max(grossWeight - tareWeight, 0) : '';

    return {
      ...nextValues,
      netWeight: netWeight === '' ? '' : String(netWeight)
    };
  };

  const selectVehicle = (vehicle) => {
    if (!vehicle) return;

    const vehicleName = getVehicleDisplayName(vehicle);
    const linkedPartyId = getVehiclePartyId(vehicle);
    const linkedParty = linkedPartyId
      ? parties.find((party) => String(party._id) === String(linkedPartyId))
      : null;
    const linkedPartyName = getPartyDisplayName(linkedParty);
    setFormData((prev) => updateWeights({
      ...prev,
      vehicleId: vehicle._id,
      partyId: linkedPartyId || prev.partyId,
      vehicleNo: vehicleName,
      tareWeight: vehicle?.unladenWeight ?? prev.tareWeight,
      partyName: linkedPartyName || prev.partyName
    }));
    setVehicleQuery(vehicleName);
    if (linkedPartyName) {
      setPartyQuery(linkedPartyName);
      const selectedPartyIndex = parties.findIndex((party) => String(party._id) === String(linkedPartyId));
      setPartyListIndex(selectedPartyIndex >= 0 ? selectedPartyIndex : 0);
    }
    setIsVehicleSectionActive(false);
    setOcrVehicleMismatch(null);
  };

  const openInlineVehicleForm = () => {
    setIsVehicleSectionActive(false);
    setShowVehicleForm(true);
  };

  const closeInlineVehicleForm = (shouldRefocusVehicle = true) => {
    setShowVehicleForm(false);
    if (!shouldRefocusVehicle) return;
    requestAnimationFrame(() => {
      vehicleInputRef.current?.focus();
      vehicleInputRef.current?.select?.();
      setIsVehicleSectionActive(true);
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => updateWeights({ ...prev, [name]: value }));
  };

  const handleVehicleFocus = () => {
    setIsVehicleSectionActive(true);
    setVehicleListIndex(filteredVehicles.length > 0 ? 0 : -1);
  };

  const handleVehicleInputChange = (event) => {
    const value = String(event.target.value || '').toUpperCase();
    setVehicleQuery(value);
    setIsVehicleSectionActive(true);
    setOcrVehicleMismatch(null);
    setFormData((prev) => ({
      ...prev,
      vehicleId: '',
      vehicleNo: value
    }));
  };

  const handleVehicleInputKeyDown = (event) => {
    if (event.key === 'Control' && !event.altKey && !event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      openInlineVehicleForm();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsVehicleSectionActive(true);
      setVehicleListIndex((prev) => {
        if (filteredVehicles.length === 0) return -1;
        return prev < filteredVehicles.length - 1 ? prev + 1 : 0;
      });
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsVehicleSectionActive(true);
      setVehicleListIndex((prev) => {
        if (filteredVehicles.length === 0) return -1;
        return prev > 0 ? prev - 1 : filteredVehicles.length - 1;
      });
      return;
    }
    if (event.key === 'Enter' && isVehicleSectionActive && filteredVehicles.length > 0) {
      event.preventDefault();
      const selectedVehicle = filteredVehicles[vehicleListIndex] || filteredVehicles[0];
      if (selectedVehicle) {
        selectVehicle(selectedVehicle);
      }
      return;
    }
  };

  const selectParty = (party) => {
    const partyName = String(party?.partyName || party?.name || '').trim();
    if (!partyName) return;
    setPartyQuery(partyName);
    setFormData((prev) => ({ ...prev, partyId: party._id || '', partyName }));
    setIsPartySectionActive(false);
  };

  const findPartyByName = useCallback((partyName) => {
    const normalizedPartyName = String(partyName || '').trim().toLowerCase();
    if (!normalizedPartyName) return null;

    return parties.find((party) => {
      const candidateName = String(party?.partyName || party?.name || '').trim().toLowerCase();
      return candidateName === normalizedPartyName;
    }) || null;
  }, [parties]);

  const ensureVehicleExists = useCallback(async () => {
    const normalizedVehicleNo = normalizeVehicleValue(formData.vehicleNo);
    const partyName = String(formData.partyName || '').trim();

    if (!normalizedVehicleNo || !partyName) {
      return formData.vehicleId || '';
    }

    const matchedVehicle = vehicles.find((vehicle) => (
      normalizeVehicleValue(getVehicleDisplayName(vehicle)) === normalizedVehicleNo
    )) || null;

    if (matchedVehicle?._id) {
      if (String(formData.vehicleId || '') !== String(matchedVehicle._id)) {
        selectVehicle(matchedVehicle);
      }
      return matchedVehicle._id;
    }

    const matchedParty = findPartyByName(partyName);
    if (!matchedParty?._id) {
      return formData.vehicleId || '';
    }

    const createdVehicle = await apiClient.post('/vehicles', {
      partyId: matchedParty._id,
      vehicleNo: String(formData.vehicleNo || '').trim().toUpperCase(),
      unladenWeight: Number(formData.tareWeight || 0),
      vehicleType: 'boulder'
    });

    if (createdVehicle?._id) {
      setVehicles((prev) => sortVehiclesByTypePreference([
        createdVehicle,
        ...prev.filter((item) => String(item._id) !== String(createdVehicle._id))
      ], 'boulder'));
      selectVehicle(createdVehicle);
      return createdVehicle._id;
    }

    return formData.vehicleId || '';
  }, [findPartyByName, formData.partyName, formData.tareWeight, formData.vehicleId, formData.vehicleNo, selectVehicle, vehicles]);

  const handlePartyFocus = () => {
    setIsPartySectionActive(true);
  };

  const handlePartyInputChange = (event) => {
    const value = event.target.value;
    setPartyQuery(value);
    setIsPartySectionActive(true);
    setFormData((prev) => ({ ...prev, partyId: '', partyName: value }));
  };

  const handlePartyInputKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsPartySectionActive(true);
      setPartyListIndex((prev) => {
        if (filteredParties.length === 0) return -1;
        return prev < filteredParties.length - 1 ? prev + 1 : 0;
      });
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsPartySectionActive(true);
      setPartyListIndex((prev) => {
        if (filteredParties.length === 0) return -1;
        return prev > 0 ? prev - 1 : filteredParties.length - 1;
      });
      return;
    }
    if (event.key === 'Enter' && isPartySectionActive && filteredParties.length > 0) {
      event.preventDefault();
      const selectedParty = filteredParties[partyListIndex] || filteredParties[0];
      if (selectedParty) {
        selectParty(selectedParty);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vehicleNo || !formData.tareWeight || !formData.grossWeight) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const ensuredVehicleId = await ensureVehicleExists();
      const payload = {
        vehicleId: ensuredVehicleId || formData.vehicleId || undefined,
        partyId: selectedParty?._id || formData.partyId || undefined,
        vehicleNo: formData.vehicleNo.toUpperCase(),
        partyName: String(formData.partyName || '').trim(),
        boulderDate: formData.boulderDate,
        entryTime: formData.entryTime,
        exitTime: formData.exitTime,
        tareWeight: parseFloat(formData.tareWeight),
        grossWeight: parseFloat(formData.grossWeight),
        netWeight: parseFloat(formData.netWeight),
        slipImg: formData.slipImg
      };

      if (isEditing) {
        await apiClient.put(`/boulders/${editingEntry._id}`, payload);
        toast.success('Boulder entry updated successfully');
      } else {
        await apiClient.post('/boulders', payload);
        toast.success('Boulder entry created successfully');
      }
      setFormData(initialFormData);
      setVehicleQuery('');
      setPartyQuery('');
      if (onModalFinish) onModalFinish();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating boulder entry');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (onModalFinish) onModalFinish();
  };

  const handleSlipUploadChange = useCallback((event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) setScannerState({ file, type: 'upload' });
  }, []);

  const handleOcrFill = useCallback((data) => {
    if (!data) return;
    const ocrRaw = String(data.vehicleNo || '').trim().toUpperCase();
    const grossWeight = Number(data.grossWeight || 0);
    const tareWeight = Number(data.tareWeight || 0);
    const netWeight = Number(data.netWeight || 0) || Math.max(grossWeight - tareWeight, 0);
    const hasExtractedFields = Boolean(ocrRaw || grossWeight > 0 || tareWeight > 0 || netWeight > 0 || data.boulderDate || data.entryTime || data.exitTime);

    if (ocrRaw) {
      const matchResult = getSmartVehicleMatch(ocrRaw, vehicles, getVehicleDisplayName);
      const { matchedVehicle, isMismatch, matchedValue } = matchResult;
      if (isMismatch) setOcrVehicleMismatch({ ocrValue: ocrRaw, matchedValue });
      else setOcrVehicleMismatch(null);
      if (matchedVehicle) selectVehicle(matchedVehicle);
      else {
        setVehicleQuery(ocrRaw);
        setFormData((prev) => ({ ...prev, vehicleNo: ocrRaw, vehicleId: '' }));
      }
    }

    setFormData((prev) => updateWeights({
      ...prev,
      grossWeight: grossWeight > 0 ? grossWeight : prev.grossWeight,
      tareWeight: tareWeight > 0 ? tareWeight : prev.tareWeight,
      netWeight: netWeight > 0 ? netWeight : prev.netWeight,
      boulderDate: data.boulderDate || prev.boulderDate,
      entryTime: data.entryTime || prev.entryTime,
      exitTime: data.exitTime || prev.exitTime,
      slipImg: data.slipImg || prev.slipImg
    }));

    if (hasExtractedFields) toast.success('Boulder slip data extracted!', { autoClose: 1500 });
  }, [vehicles, selectVehicle]);

  const uploadSlipFile = useCallback(async (file) => {
    const body = new FormData();
    body.append('slip', file);
    const response = await apiClient.post('/uploads/slip', body, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response?.url || response?.relativePath || '';
  }, []);

  const sendImageToOcr = useCallback(async (file) => {
    if (!file) return;
    setIsOcrLoading(true);
    try {
      const slipImg = await uploadSlipFile(file);
      setFormData((prev) => ({ ...prev, slipImg: slipImg || prev.slipImg }));
      const fd = new FormData();
      fd.append('image', file);
      const baseURL = String(apiClient.defaults.baseURL || '/api').replace(/\/+$/, '');
      const response = await fetch(`${baseURL}/ocr/extract-boulder`, { method: 'POST', body: fd, credentials: 'include' });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'OCR failed' }));
        throw new Error(err.message || 'OCR failed');
      }
      const data = await response.json();
      handleOcrFill({ ...data, slipImg });
    } catch (error) {
      console.error('Boulder OCR error:', error);
      toast.error(error.message || 'Error scanning boulder slip');
    } finally {
      setIsOcrLoading(false);
      setOcrMode('');
    }
  }, [handleOcrFill, uploadSlipFile]);

  const handleOcrFileChange = useCallback((event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) setScannerState({ file, type: 'ocr' });
  }, []);

  const handleOcrCameraChange = useCallback((event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) setScannerState({ file, type: 'ocr' });
  }, []);

  const isSlipPreviewImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(String(formData.slipImg || ''));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[2px] md:items-center md:p-6" onClick={handleClose}>
      <div className="relative flex h-[100dvh] max-h-[100dvh] w-full max-w-[30rem] md:max-w-[64rem] flex-col overflow-hidden rounded-none border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)] md:h-auto md:max-h-[95vh] md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[linear-gradient(135deg,#2563eb_0%,#4338ca_55%,#7c3aed_100%)] px-4 py-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold md:text-lg">{isEditing ? 'Edit Boulder Entry' : 'Add Boulder Entry'}</h2>
              <p className="text-[11px] text-white/80 md:text-xs">Register incoming boulder weight</p>
            </div>
            <div className="flex items-center gap-2">
              <input ref={ocrCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleOcrCameraChange} tabIndex={-1} />
              <input ref={ocrFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleOcrFileChange} tabIndex={-1} />
              <button type="button" onClick={() => { setOcrMode('camera'); ocrCameraInputRef.current?.click(); }} disabled={isOcrLoading} className="flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/15 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/25">
                {isOcrLoading && ocrMode === 'camera' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                Scan Slip
              </button>
              <button type="button" onClick={() => { setOcrMode('upload'); ocrFileInputRef.current?.click(); }} disabled={isOcrLoading} className="flex items-center gap-1.5 rounded-lg border border-emerald-400/50 bg-emerald-500/20 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500/35">
                {isOcrLoading && ocrMode === 'upload' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Upload Slip
              </button>
              <button type="button" onClick={handleClose} className="rounded-lg p-1.5 text-white transition hover:bg-white/20">
                <X className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            </div>
          </div>
        </div>

        {isOcrLoading && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/80 backdrop-blur-sm">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold text-indigo-700">Extracting data with AI...</p>
          </div>
        )}

        {scannerState && (
          <DocumentScannerPreview
            file={scannerState.file}
            onCancel={() => setScannerState(null)}
            onConfirm={async (processedFile) => {
              const type = scannerState.type;
              setScannerState(null);
              if (type === 'ocr') await sendImageToOcr(processedFile);
              else {
                try {
                  setUploadingSlip(true);
                  const url = await uploadSlipFile(processedFile);
                  setFormData((prev) => ({ ...prev, slipImg: url }));
                  toast.success('Slip uploaded successfully');
                } catch (error) {
                  toast.error(error?.message || 'Error uploading slip');
                } finally {
                  setUploadingSlip(false);
                }
              }
            }}
          />
        )}

        <form onSubmit={handleSubmit} onKeyDown={(e) => handlePopupFormKeyDown(e, handleClose)} className="flex flex-1 flex-col overflow-hidden bg-slate-50">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            
            {/* Section 1: Primary Details (Blue) */}
            <div className="rounded-2xl border border-blue-200 bg-white p-3 shadow-sm transition hover:shadow-md">
              <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-blue-900">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">1</span>
                Primary Details
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Entry Date */}
                <div className="space-y-1">
                  <label className={labelClass}>Entry Date</label>
                  <div className="relative">
                    <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input ref={dateInputRef} type="date" name="boulderDate" value={formData.boulderDate || ''} onChange={handleChange} className={`${inputClass} pl-9 focus:ring-blue-500`} autoFocus />
                  </div>
                </div>

                {/* Vehicle No */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>Vehicle No</label>
                    <button type="button" onClick={openInlineVehicleForm} className="text-[10px] font-bold text-blue-600 hover:underline">+ New Vehicle</button>
                  </div>
                  <div ref={vehicleSectionRef} className="relative">
                    <input ref={vehicleInputRef} type="text" value={vehicleQuery} onChange={handleVehicleInputChange} onKeyDown={handleVehicleInputKeyDown} className={`${inputClass} focus:ring-blue-500 uppercase`} placeholder="Type vehicle no..." autoComplete="off" />
                    {isVehicleSectionActive && vehicleDropdownStyle && (
                      <div className="fixed z-[80] overflow-hidden rounded-xl border border-blue-200 bg-white shadow-xl" style={vehicleDropdownStyle}>
                        <div className="bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700 uppercase">Vehicles ({filteredVehicles.length})</div>
                        <div className="overflow-y-auto py-1" style={{ maxHeight: vehicleDropdownStyle.maxHeight }}>
                          {filteredVehicles.length === 0 ? <div className="px-3 py-2 text-xs text-slate-500">No vehicles found</div> : filteredVehicles.map((v, i) => (
                            <button key={v._id} type="button" onMouseDown={e => e.preventDefault()} onMouseEnter={() => setVehicleListIndex(i)} onClick={() => selectVehicle(v)} className={`w-full px-3 py-2 text-left text-xs ${i === vehicleListIndex ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-50'}`}>{getVehicleDisplayName(v)}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Party Name */}
                <div className="space-y-1">
                  <label className={labelClass}>Supplier Name</label>
                  <div ref={partySectionRef} className="relative">
                    <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input ref={partyInputRef} type="text" name="partyName" value={partyQuery} onChange={handlePartyInputChange} onKeyDown={handlePartyInputKeyDown} className={`${inputClass} pl-9 pr-10 focus:ring-blue-500`} placeholder="Type to search party..." autoComplete="off" />
                    {isPartySectionActive && partyDropdownStyle && (
                      <div className="fixed z-[80] overflow-hidden rounded-xl border border-blue-200 bg-white shadow-xl" style={partyDropdownStyle}>
                        <div className="bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700 uppercase">Suppliers ({filteredParties.length})</div>
                        <div className="overflow-y-auto py-1" style={{ maxHeight: partyDropdownStyle.maxHeight }}>
                          {filteredParties.length === 0 ? <div className="px-3 py-2 text-xs text-slate-500">No matching suppliers</div> : filteredParties.map((p, i) => (
                            <button key={p._id || i} type="button" onMouseDown={e => e.preventDefault()} onMouseEnter={() => setPartyListIndex(i)} onClick={() => selectParty(p)} className={`w-full px-3 py-2 text-left text-xs ${i === partyListIndex ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-50'}`}>{getPartyDisplayName(p)}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Time Details */}
              {formData.slipImg && (
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="space-y-1">
                    <label className={labelClass}>Entry Time</label>
                    <input type="time" name="entryTime" value={formData.entryTime || ''} onChange={handleChange} className={`${inputClass} focus:ring-blue-500`} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Exit Time</label>
                    <input type="time" name="exitTime" value={formData.exitTime || ''} onChange={handleChange} className={`${inputClass} focus:ring-blue-500`} />
                  </div>
                </div>
              )}

              {ocrVehicleMismatch && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-800 flex justify-between items-center">
                  <span>OCR read "{ocrVehicleMismatch.ocrValue}", matched last-4 digits with "{ocrVehicleMismatch.matchedValue}"</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setVehicleQuery(ocrVehicleMismatch.ocrValue); setFormData(prev => ({ ...prev, vehicleNo: ocrVehicleMismatch.ocrValue, vehicleId: '' })); setOcrVehicleMismatch(null); }} className="px-2 py-1 bg-white border border-amber-300 rounded font-bold">Use OCR</button>
                    <button type="button" onClick={() => setOcrVehicleMismatch(null)} className="px-2 py-1 bg-amber-600 text-white rounded font-bold">Use Matched</button>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Weight Details (Emerald) */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-3 shadow-sm transition hover:shadow-md">
              <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-emerald-900">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">2</span>
                Weight Details
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className={labelClass}>Gross Weight (KG)</label>
                  <input type="number" name="grossWeight" value={formData.grossWeight || ''} onChange={handleChange} className={`${inputClass} focus:ring-emerald-500 font-bold`} placeholder="0" step="0.01" />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Tare Weight (KG)</label>
                  <input type="number" name="tareWeight" value={formData.tareWeight || ''} onChange={handleChange} className={`${inputClass} focus:ring-emerald-500 font-bold`} placeholder="0" step="0.01" />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Net Weight (KG)</label>
                  <div className="relative">
                    <Scale className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-400 pointer-events-none" />
                    <input type="number" name="netWeight" value={formData.netWeight || ''} readOnly className={`${inputClass} pl-9 bg-emerald-50/50 font-bold text-emerald-700`} placeholder="0" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Pricing Summary (Purple) */}
            <div className="rounded-2xl border border-purple-200 bg-purple-50/30 p-3 shadow-sm transition hover:shadow-md">
              <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-purple-900">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white">3</span>
                Pricing Summary
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className={labelClass}>Boulder Rate Per Ton</label>
                  <div className="rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-sm font-bold text-purple-700 shadow-inner">
                    {boulderRatePerTon > 0 ? `${boulderRatePerTon.toLocaleString('en-IN')} Rs/Ton` : 'No rate set'}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Total Payable Amount</label>
                  <div className="rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-sm font-bold text-emerald-700 shadow-inner">
                    Rs {boulderTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {formData.slipImg && (
                <div className="mt-3">
                  <label className={labelClass}>Slip Preview</label>
                  <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                    {isSlipPreviewImage ? <img src={formData.slipImg} alt="Slip" className="h-32 w-full object-cover" /> : <div className="h-32 flex items-center justify-center text-xs text-slate-400 bg-slate-50 italic">Document Uploaded</div>}
                    <a href={formData.slipImg} target="_blank" rel="noreferrer" className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1"><Eye className="h-4 w-4" /> View Full Slip</a>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
            <div className="hidden md:block text-[10px] text-slate-400">Press <kbd className="rounded bg-slate-100 px-1 py-0.5 border">Esc</kbd> to cancel</div>
            <div className="flex gap-2 w-full md:w-auto">
              <button type="button" onClick={handleClose} className="flex-1 md:flex-none px-6 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 md:flex-none px-8 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-sm font-bold text-white shadow-lg hover:shadow-blue-500/30 transition disabled:opacity-50">
                {loading ? 'Saving...' : (isEditing ? 'Update Entry' : 'Save Entry')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {showVehicleForm ? (
        <AddVehiclePopup
          vehicle={null}
          defaultVehicleType="boulder"
          onClose={() => closeInlineVehicleForm(true)}
          onSave={fetchVehicles}
          onVehicleSaved={async (savedVehicle) => {
            if (!savedVehicle) return;
            setVehicles((prev) => sortVehiclesByTypePreference([savedVehicle, ...prev.filter((item) => String(item._id) !== String(savedVehicle._id))], 'boulder'));
            selectVehicle(savedVehicle);
            closeInlineVehicleForm(true);
          }}
        />
      ) : null}
    </div>
  );
}
