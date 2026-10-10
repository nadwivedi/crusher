import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Building2, Camera, ChevronDown, Eye, Loader2, Plus, Scale, Truck, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../utils/api';
import { handlePopupFormKeyDown } from '../../utils/popupFormKeyboard';
import { useFloatingDropdownPosition } from '../../utils/useFloatingDropdownPosition';
import { getSmartVehicleMatch, normalizeVehicleValue } from '../../utils/vehicleMatching';
import DocumentScannerPreview from '../../components/DocumentScannerPreview';
import FormPopup from '../../components/FormPopup';
import FormSection from '../../components/FormSection';
import OptionList from '../../components/OptionList';
import Segmented from '../../components/Segmented';
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
  entryMode: 'single',
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
  averageWeightTon: '',
  tripCount: '',
  // Empty until picked: goes by whichever boulder rate the supplier has
  boulderRateBasis: '',
  slipImg: ''
};

const BOULDER_RATE_BASES = [
  { value: 'per_ton', label: 'Per Ton' },
  { value: 'per_trip', label: 'Per Trip' }
];

// The supplier's boulder and transport rates; a non-supplier has none
const getSupplierRates = (party) => {
  const isSupplier = party?.type === 'supplier';
  const toRate = (value) => (isSupplier ? Math.max(0, Number(value || 0) || 0) : 0);
  return {
    perTon: toRate(party?.boulderRatePerTon),
    perTrip: toRate(party?.boulderRatePerTrip),
    transport: toRate(party?.transportRate),
    transportBasis: party?.transportRateBasis === 'per_trip' ? 'per_trip' : 'per_ton'
  };
};

const getDefaultRateBasis = (rates) => (rates.perTon <= 0 && rates.perTrip > 0 ? 'per_trip' : 'per_ton');

const describeSupplierRates = (party) => {
  const rates = getSupplierRates(party);
  return [
    rates.perTon > 0 ? `₹${rates.perTon.toLocaleString('en-IN')} / ton` : '',
    rates.perTrip > 0 ? `₹${rates.perTrip.toLocaleString('en-IN')} / trip` : ''
  ].filter(Boolean).join(' · ');
};

const formatRupees = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
  
  const getVehicleDisplayName = (vehicle) => String(vehicle?.vehicleNumber || vehicle?.vehicleNo || '').trim();
  const getPartyDisplayName = (party) => String(party?.partyName || party?.name || '').trim();
  const getVehiclePartyId = (vehicle) => (
    typeof vehicle?.partyId === 'object'
      ? vehicle?.partyId?._id || ''
      : vehicle?.partyId || ''
  );
  const isEditing = Boolean(editingEntry?._id);
  const isBulkMode = formData.entryMode === 'bulk';

  const selectedParty = useMemo(() => {
    const normalizedPartyName = String(formData.partyName || '').trim().toLowerCase();
    if (!normalizedPartyName) return null;

    return parties.find((party) => (
      String(party?.partyName || party?.name || '').trim().toLowerCase() === normalizedPartyName
    )) || null;
  }, [formData.partyName, parties]);

  const supplierRates = useMemo(() => getSupplierRates(selectedParty), [selectedParty]);
  const boulderRateBasis = formData.boulderRateBasis || getDefaultRateBasis(supplierRates);
  const boulderRate = boulderRateBasis === 'per_trip' ? supplierRates.perTrip : supplierRates.perTon;

  // Bulk mode total in kg: trips x average weight per trip (entered in tons).
  const bulkTotalWeight = useMemo(() => {
    const trips = Math.floor(Number(formData.tripCount || 0));
    const averageTon = Number(formData.averageWeightTon || 0);
    if (!Number.isFinite(trips) || trips <= 0 || !Number.isFinite(averageTon) || averageTon <= 0) return 0;
    return trips * averageTon * 1000;
  }, [formData.averageWeightTon, formData.tripCount]);

  // A per-ton rate goes on the net weight; a per-trip rate on the trips (one for a single entry)
  const payableTons = Math.max(0, (isBulkMode ? bulkTotalWeight : Number(formData.netWeight || 0)) / 1000) || 0;
  const payableTrips = isBulkMode ? Math.max(0, Math.floor(Number(formData.tripCount || 0)) || 0) : 1;
  const boulderAmount = (boulderRateBasis === 'per_trip' ? payableTrips : payableTons) * boulderRate;
  const transportAmount = (supplierRates.transportBasis === 'per_trip' ? payableTrips : payableTons) * supplierRates.transport;
  const boulderTotalAmount = boulderAmount + transportAmount;

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

    const entryMode = editingEntry.entryMode === 'bulk' ? 'bulk' : 'single';
    setFormData({
      entryMode,
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
      averageWeightTon: entryMode === 'bulk' ? String(Number(editingEntry.averageWeight || 0) / 1000) : '',
      tripCount: entryMode === 'bulk' ? String(editingEntry.tripCount || '') : '',
      boulderRateBasis: editingEntry.boulderRateBasis || 'per_ton',
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
    setFormData((prev) => ({ ...prev, partyId: party._id || '', partyName, boulderRateBasis: getDefaultRateBasis(getSupplierRates(party)) }));
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
    if (isBulkMode) {
      if (!formData.vehicleNo || bulkTotalWeight <= 0) {
        toast.error('Please fill vehicle no, average weight and no. of trips');
        return;
      }
    } else if (!formData.vehicleNo || !formData.tareWeight || !formData.grossWeight) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const ensuredVehicleId = await ensureVehicleExists();
      const basePayload = {
        vehicleId: ensuredVehicleId || formData.vehicleId || undefined,
        partyId: selectedParty?._id || formData.partyId || undefined,
        vehicleNo: formData.vehicleNo.toUpperCase(),
        partyName: String(formData.partyName || '').trim(),
        boulderDate: formData.boulderDate,
        entryTime: formData.entryTime,
        exitTime: formData.exitTime,
        boulderRateBasis,
        slipImg: formData.slipImg
      };
      const payload = isBulkMode
        ? {
            ...basePayload,
            entryMode: 'bulk',
            tripCount: Math.floor(Number(formData.tripCount)),
            averageWeight: Number(formData.averageWeightTon) * 1000
          }
        : {
            ...basePayload,
            entryMode: 'single',
            tareWeight: parseFloat(formData.tareWeight),
            grossWeight: parseFloat(formData.grossWeight),
            netWeight: parseFloat(formData.netWeight)
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
  const formatKg = (value) => `${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg`;
  const formatTon = (kg) => `${(Number(kg || 0) / 1000).toLocaleString('en-IN', { maximumFractionDigits: 3 })} ton`;
  const payableWeight = isBulkMode ? bulkTotalWeight : Number(formData.netWeight || 0);

  const slipButtons = !isBulkMode && (
    <>
      <button
        type="button"
        onClick={() => { setOcrMode('camera'); ocrCameraInputRef.current?.click(); }}
        disabled={isOcrLoading}
        title="Take a photo of the weighbridge slip"
        className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/25 disabled:opacity-60"
      >
        {isOcrLoading && ocrMode === 'camera' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">Scan Slip</span>
      </button>
      <button
        type="button"
        onClick={() => { setOcrMode('upload'); ocrFileInputRef.current?.click(); }}
        disabled={isOcrLoading}
        title="Upload a slip photo and fill the form from it"
        className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/25 disabled:opacity-60"
      >
        {isOcrLoading && ocrMode === 'upload' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">Upload Slip</span>
      </button>
    </>
  );

  return (
    <>
      <input ref={ocrCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleOcrCameraChange} tabIndex={-1} />
      <input ref={ocrFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleOcrFileChange} tabIndex={-1} />

      <FormPopup
        title={isEditing ? 'Edit Boulder Entry' : 'Add Boulder Entry'}
        subtitle={isBulkMode ? 'All trips of one vehicle at once' : 'Boulder coming in on the weighbridge'}
        submitLabel={loading ? 'Saving...' : isEditing ? 'Update Entry' : 'Save Entry'}
        submitDisabled={loading || isOcrLoading}
        maxWidth="max-w-3xl"
        headerActions={slipButtons}
        onSubmit={handleSubmit}
        onClose={handleClose}
        onKeyDown={(e) => handlePopupFormKeyDown(e, handleClose)}
      >
        <Segmented
          className="w-full [&>button]:flex-1 [&>button]:justify-center"
          options={[
            { key: 'single', label: 'Single Slip', shortLabel: 'Single' },
            { key: 'bulk', label: 'Bulk Trips', shortLabel: 'Bulk' }
          ]}
          value={formData.entryMode}
          onChange={(mode) => setFormData((prev) => ({ ...prev, entryMode: mode }))}
        />

        <FormSection number={1} title="Vehicle & Supplier" tone="blue">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="boulder-date-input">Date</label>
              <input id="boulder-date-input" ref={dateInputRef} className="input" type="date" name="boulderDate" value={formData.boulderDate || ''} onChange={handleChange} autoFocus />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="label mb-0" htmlFor="boulder-vehicle-input">Vehicle No. <span className="text-rose-500">*</span></label>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={openInlineVehicleForm} className="text-xs font-semibold text-primary-600 hover:underline">+ New</button>
              </div>
              <div
                ref={vehicleSectionRef}
                className="relative"
                onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsVehicleSectionActive(false); }}
              >
                <Truck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="boulder-vehicle-input"
                  ref={vehicleInputRef}
                  className="input pl-9 pr-9 font-semibold uppercase"
                  type="text"
                  value={vehicleQuery}
                  onFocus={handleVehicleFocus}
                  onChange={handleVehicleInputChange}
                  onKeyDown={handleVehicleInputKeyDown}
                  placeholder="CG04AB1234"
                  autoComplete="off"
                />
                <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isVehicleSectionActive ? 'rotate-180' : ''}`} />
                {isVehicleSectionActive && vehicleDropdownStyle && (
                  <OptionList
                    style={vehicleDropdownStyle}
                    options={filteredVehicles}
                    activeIndex={vehicleListIndex}
                    emptyText={vehicleQuery ? 'Not saved yet. Pick a supplier and it is added on save.' : 'No vehicles yet.'}
                    getKey={(vehicle) => vehicle._id}
                    getLabel={getVehicleDisplayName}
                    getHint={(vehicle) => (Number(vehicle.unladenWeight || 0) > 0 ? `Tare ${formatKg(vehicle.unladenWeight)}` : '')}
                    isSelected={(vehicle) => String(formData.vehicleId || '') === String(vehicle._id)}
                    onHover={setVehicleListIndex}
                    onPick={selectVehicle}
                    footer={(
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={openInlineVehicleForm}
                        className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm font-semibold text-primary-600 transition hover:bg-primary-50"
                      >
                        <Plus className="h-4 w-4" />
                        Add New Vehicle
                        <kbd className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Ctrl</kbd>
                      </button>
                    )}
                  />
                )}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="boulder-party-input">Supplier</label>
              <div
                ref={partySectionRef}
                className="relative"
                onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsPartySectionActive(false); }}
              >
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="boulder-party-input"
                  ref={partyInputRef}
                  className="input pl-9 pr-9"
                  type="text"
                  name="partyName"
                  value={partyQuery}
                  onFocus={handlePartyFocus}
                  onChange={handlePartyInputChange}
                  onKeyDown={handlePartyInputKeyDown}
                  placeholder="Search supplier..."
                  autoComplete="off"
                />
                <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isPartySectionActive ? 'rotate-180' : ''}`} />
                {isPartySectionActive && partyDropdownStyle && (
                  <OptionList
                    style={partyDropdownStyle}
                    options={filteredParties}
                    activeIndex={partyListIndex}
                    emptyText="No matching supplier."
                    getKey={(party) => party._id}
                    getLabel={getPartyDisplayName}
                    getHint={describeSupplierRates}
                    isSelected={(party) => String(formData.partyId || '') === String(party._id)}
                    onHover={setPartyListIndex}
                    onPick={selectParty}
                  />
                )}
              </div>
            </div>
          </div>

          {formData.slipImg && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="boulder-entry-time">Entry Time</label>
                <input id="boulder-entry-time" className="input" type="time" name="entryTime" value={formData.entryTime || ''} onChange={handleChange} />
              </div>
              <div>
                <label className="label" htmlFor="boulder-exit-time">Exit Time</label>
                <input id="boulder-exit-time" className="input" type="time" name="exitTime" value={formData.exitTime || ''} onChange={handleChange} />
              </div>
            </div>
          )}

          {ocrVehicleMismatch && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Slip says <b>{ocrVehicleMismatch.ocrValue}</b>, closest saved vehicle is <b>{ocrVehicleMismatch.matchedValue}</b>.
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setVehicleQuery(ocrVehicleMismatch.ocrValue);
                    setFormData((prev) => ({ ...prev, vehicleNo: ocrVehicleMismatch.ocrValue, vehicleId: '' }));
                    setOcrVehicleMismatch(null);
                  }}
                  className="rounded-md bg-white px-2 py-1 font-semibold ring-1 ring-amber-300 hover:bg-amber-100"
                >
                  Use slip
                </button>
                <button type="button" onClick={() => setOcrVehicleMismatch(null)} className="rounded-md bg-amber-600 px-2 py-1 font-semibold text-white hover:bg-amber-700">
                  Keep saved
                </button>
              </div>
            </div>
          )}
        </FormSection>

        {isBulkMode ? (
          <FormSection number={2} title="Trips" tone="emerald">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="boulder-avg-weight">Avg. Weight / Trip (ton) <span className="text-rose-500">*</span></label>
                <input id="boulder-avg-weight" className="input text-right font-semibold" type="number" name="averageWeightTon" value={formData.averageWeightTon || ''} onChange={handleChange} placeholder="10" step="0.01" min="0" />
              </div>
              <div>
                <label className="label" htmlFor="boulder-trips">No. of Trips <span className="text-rose-500">*</span></label>
                <input id="boulder-trips" className="input text-right font-semibold" type="number" name="tripCount" value={formData.tripCount || ''} onChange={handleChange} placeholder="20" step="1" min="1" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="label">Total Weight</p>
                <p className="flex min-h-[2.5rem] items-center justify-end rounded-lg bg-white px-3 text-sm font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  {bulkTotalWeight > 0 ? formatTon(bulkTotalWeight) : '-'}
                </p>
              </div>
            </div>
            {bulkTotalWeight > 0 && (
              <p className="text-xs text-slate-500">
                {Math.floor(Number(formData.tripCount))} trips × {Number(formData.averageWeightTon).toLocaleString('en-IN', { maximumFractionDigits: 2 })} ton = {formatKg(bulkTotalWeight)}
              </p>
            )}
          </FormSection>
        ) : (
          <FormSection number={2} title="Weight" tone="emerald" hint={formData.vehicleId ? 'Tare is filled from the saved vehicle. Change it if needed.' : ''}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="boulder-gross">Gross (kg) <span className="text-rose-500">*</span></label>
                <input id="boulder-gross" className="input text-right font-semibold" type="number" name="grossWeight" value={formData.grossWeight || ''} onChange={handleChange} placeholder="0" step="0.01" />
              </div>
              <div>
                <label className="label" htmlFor="boulder-tare">Tare (kg) <span className="text-rose-500">*</span></label>
                <input id="boulder-tare" className="input text-right font-semibold" type="number" name="tareWeight" value={formData.tareWeight || ''} onChange={handleChange} placeholder="0" step="0.01" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="label">Net Weight</p>
                <p className="flex min-h-[2.5rem] items-center justify-between gap-2 rounded-lg bg-white px-3 text-sm ring-1 ring-inset ring-emerald-200">
                  <Scale className="h-4 w-4 shrink-0 text-emerald-500" />
                  {Number(formData.netWeight || 0) > 0 ? (
                    <span className="text-right">
                      <span className="font-bold text-emerald-700">{formatKg(formData.netWeight)}</span>
                      <span className="ml-1.5 text-xs text-slate-500">{formatTon(formData.netWeight)}</span>
                    </span>
                  ) : <span className="text-slate-400">Gross − Tare</span>}
                </p>
              </div>
            </div>
          </FormSection>
        )}

        <FormSection number={3} title="Amount" tone="indigo">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Boulder charged</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {BOULDER_RATE_BASES.map((option) => {
                    const active = boulderRateBasis === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, boulderRateBasis: option.value }))}
                        aria-pressed={active}
                        className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${active ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-lg bg-white px-3 py-2.5 text-sm ring-1 ring-inset ring-indigo-200">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span className="text-slate-600">
                    {boulderRate > 0
                      ? boulderRateBasis === 'per_trip'
                        ? <>Boulder: {payableTrips} trip{payableTrips === 1 ? '' : 's'} × ₹{boulderRate.toLocaleString('en-IN')} / trip</>
                        : <>Boulder: {formatTon(payableWeight)} × ₹{boulderRate.toLocaleString('en-IN')} / ton</>
                      : <span className="text-amber-700">{selectedParty ? `No boulder rate ${boulderRateBasis === 'per_trip' ? 'per trip' : 'per ton'} set for this supplier` : 'Pick a supplier to see the amount'}</span>}
                  </span>
                  <span className={supplierRates.transport > 0 ? 'font-semibold text-slate-800' : 'text-base font-bold text-slate-900'}>{formatRupees(boulderAmount)}</span>
                </div>
                {supplierRates.transport > 0 && (
                  <>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <span className="text-slate-600">
                        {supplierRates.transportBasis === 'per_trip'
                          ? <>Transport: {payableTrips} trip{payableTrips === 1 ? '' : 's'} × ₹{supplierRates.transport.toLocaleString('en-IN')} / trip</>
                          : <>Transport: {formatTon(payableWeight)} × ₹{supplierRates.transport.toLocaleString('en-IN')} / ton</>}
                      </span>
                      <span className="font-semibold text-slate-800">{formatRupees(transportAmount)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between border-t border-slate-200 pt-1.5">
                      <span className="font-semibold text-slate-700">Total to supplier</span>
                      <span className="text-base font-bold text-slate-900">{formatRupees(boulderTotalAmount)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {formData.slipImg && (
              <a
                href={formData.slipImg}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2 rounded-lg bg-white p-1.5 pr-3 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:text-primary-700 hover:ring-primary-300"
              >
                {isSlipPreviewImage
                  ? <img src={formData.slipImg} alt="Weighbridge slip" className="h-10 w-10 rounded-md object-cover" />
                  : <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100"><Eye className="h-4 w-4" /></span>}
                View slip
              </a>
            )}
          </div>
        </FormSection>
      </FormPopup>

      {isOcrLoading && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-3 bg-white/75 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
          <p className="text-sm font-semibold text-primary-700">Reading the slip...</p>
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
    </>
  );
}
