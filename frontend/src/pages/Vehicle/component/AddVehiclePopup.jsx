import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Scale, Truck } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../../utils/api';
import AddPartyPopup from '../../Party/component/AddPartyPopup';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { useFloatingDropdownPosition } from '../../../utils/useFloatingDropdownPosition';

const initialFormData = {
  partyId: '',
  vehicleNo: '',
  unladenWeight: '',
  vehicleType: 'sales'
};

const FIELD_SELECTOR = [
  'input:not([type="hidden"]):not([disabled]):not([readonly])',
  'select:not([disabled]):not([readonly])',
  'textarea:not([disabled]):not([readonly])'
].join(', ');

const VEHICLE_TYPE_OPTIONS = [
  {
    value: 'sales',
    label: 'Sales',
    description: 'Use for delivery and outward dispatch vehicles.'
  },
  {
    value: 'boulder',
    label: 'Boulder Load',
    description: 'Use for boulder transport and quarry inward loads.'
  }
];

const getInlineFieldClass = (tone = 'indigo') => {
  const focusTone = tone === 'emerald'
    ? 'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
    : 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';

  return `w-full flex-1 min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900 transition-all placeholder:font-normal placeholder:text-gray-400 focus:outline-none ${focusTone}`;
};

const isVisibleField = (element) => {
  if (!element) return false;
  if (element.tabIndex === -1) return false;

  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
};

const getFormFields = (form) => (
  Array.from(form.querySelectorAll(FIELD_SELECTOR)).filter(isVisibleField)
);

const focusNextField = (currentElement) => {
  if (!(currentElement instanceof HTMLElement)) return;

  const form = currentElement.closest('form');
  if (!form) return;

  const fields = getFormFields(form);
  const currentIndex = fields.indexOf(currentElement);
  if (currentIndex === -1) return;

  const nextField = fields[currentIndex + 1];
  if (!(nextField instanceof HTMLElement)) return;

  nextField.focus();
  if (nextField instanceof HTMLInputElement && typeof nextField.select === 'function') {
    nextField.select();
  }
};

const getPartyLabel = (party) => party?.partyName || party?.name || '';

const getVehicleTypeLabel = (typeValue) => (
  VEHICLE_TYPE_OPTIONS.find((option) => option.value === typeValue)?.label || ''
);

const getInitialPartyFormData = () => ({
  type: 'customer',
  name: '',
  mobile: '',
  email: '',
  address: '',
  state: '',
  pincode: '',
  openingBalance: '',
  openingBalanceType: 'receivable',
  tenMmRate: '',
  twentyMmRate: '',
  fortyMmRate: '',
  wmmRate: '',
  gsbRate: '',
  dustRate: ''
});

const toTitleCase = (value) => String(value || '')
  .toLowerCase()
  .replace(/\b[a-z]/g, (char) => char.toUpperCase());

export default function AddVehiclePopup({ vehicle, onClose, onSave }) {
  const [formData, setFormData] = useState(vehicle || initialFormData);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [partyQuery, setPartyQuery] = useState('');
  const [partyListIndex, setPartyListIndex] = useState(0);
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const [showPartyForm, setShowPartyForm] = useState(false);
  const [partyFormData, setPartyFormData] = useState(getInitialPartyFormData());
  const [partyPopupLoading, setPartyPopupLoading] = useState(false);
  const [partyPopupError, setPartyPopupError] = useState('');
  const [vehicleTypeQuery, setVehicleTypeQuery] = useState('');
  const [vehicleTypeListIndex, setVehicleTypeListIndex] = useState(0);
  const [isVehicleTypeDropdownOpen, setIsVehicleTypeDropdownOpen] = useState(false);
  const partySectionRef = useRef(null);
  const partyInputRef = useRef(null);
  const vehicleTypeSectionRef = useRef(null);
  const vehicleTypeInputRef = useRef(null);
  const isEditing = Boolean(vehicle?._id);

  useEffect(() => {
    setFormData(vehicle || initialFormData);
  }, [vehicle]);

  useEffect(() => {
    const fetchParties = async () => {
      try {
        const response = await apiClient.get('/parties');
        setParties(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('Error fetching parties:', error);
      }
    };

    fetchParties();
  }, []);

  const selectedParty = useMemo(
    () => parties.find((party) => party._id === formData.partyId) || null,
    [formData.partyId, parties]
  );

  const filteredPartyOptions = useMemo(() => {
    const normalized = String(partyQuery || '').trim().toLowerCase();
    const selectedLabel = String(getPartyLabel(selectedParty) || '').trim().toLowerCase();

    if (isPartyDropdownOpen && normalized && normalized === selectedLabel) {
      return parties;
    }

    if (!normalized) return parties;

    const startsWith = parties.filter((party) => getPartyLabel(party).toLowerCase().startsWith(normalized));
    const includes = parties.filter((party) => (
      !getPartyLabel(party).toLowerCase().startsWith(normalized)
      && getPartyLabel(party).toLowerCase().includes(normalized)
    ));

    return [...startsWith, ...includes];
  }, [isPartyDropdownOpen, parties, partyQuery, selectedParty]);

  const filteredVehicleTypeOptions = useMemo(() => {
    const normalized = String(vehicleTypeQuery || '').trim().toLowerCase();
    const selectedLabel = String(getVehicleTypeLabel(formData.vehicleType) || '').trim().toLowerCase();

    if (isVehicleTypeDropdownOpen && normalized && normalized === selectedLabel) {
      return VEHICLE_TYPE_OPTIONS;
    }

    if (!normalized) return VEHICLE_TYPE_OPTIONS;

    const startsWith = VEHICLE_TYPE_OPTIONS.filter((option) => option.label.toLowerCase().startsWith(normalized));
    const includes = VEHICLE_TYPE_OPTIONS.filter((option) => (
      !option.label.toLowerCase().startsWith(normalized)
      && option.label.toLowerCase().includes(normalized)
    ));

    return [...startsWith, ...includes];
  }, [formData.vehicleType, isVehicleTypeDropdownOpen, vehicleTypeQuery]);

  useEffect(() => {
    setPartyQuery(getPartyLabel(selectedParty));
  }, [selectedParty]);

  useEffect(() => {
    setVehicleTypeQuery(getVehicleTypeLabel(formData.vehicleType));
  }, [formData.vehicleType]);

  useEffect(() => {
    if (filteredPartyOptions.length === 0) {
      setPartyListIndex(-1);
      return;
    }

    setPartyListIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= filteredPartyOptions.length) return filteredPartyOptions.length - 1;
      return prev;
    });
  }, [filteredPartyOptions]);

  useEffect(() => {
    if (filteredVehicleTypeOptions.length === 0) {
      setVehicleTypeListIndex(-1);
      return;
    }

    setVehicleTypeListIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= filteredVehicleTypeOptions.length) return filteredVehicleTypeOptions.length - 1;
      return prev;
    });
  }, [filteredVehicleTypeOptions]);

  const partyDropdownStyle = useFloatingDropdownPosition(
    partySectionRef,
    isPartyDropdownOpen,
    [filteredPartyOptions.length, partyListIndex]
  );

  const vehicleTypeDropdownStyle = useFloatingDropdownPosition(
    vehicleTypeSectionRef,
    isVehicleTypeDropdownOpen,
    [filteredVehicleTypeOptions.length, vehicleTypeListIndex]
  );

  const clearError = (name) => {
    setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearError(name);
  };

  const setVehicleTypeValue = (value) => {
    setFormData((prev) => ({ ...prev, vehicleType: value }));
    clearError('vehicleType');
  };

  const handlePartyFocus = () => {
    setIsPartyDropdownOpen(true);
    setPartyQuery(getPartyLabel(selectedParty));
    const selectedIndex = parties.findIndex((party) => party._id === formData.partyId);
    setPartyListIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const handlePartyInputChange = (event) => {
    const nextValue = event.target.value;
    setPartyQuery(nextValue);
    setIsPartyDropdownOpen(true);
    if (formData.partyId) {
      setFormData((prev) => ({ ...prev, partyId: '' }));
    }
    clearError('partyId');
  };

  const selectParty = (party, moveNext = false) => {
    if (!party) return;

    setFormData((prev) => ({ ...prev, partyId: party._id }));
    setPartyQuery(getPartyLabel(party));
    setPartyListIndex(Math.max(parties.findIndex((item) => item._id === party._id), 0));
    setIsPartyDropdownOpen(false);
    clearError('partyId');

    if (moveNext) {
      focusNextField(partyInputRef.current);
    }
  };

  const openInlinePartyForm = () => {
    setPartyFormData((prev) => ({
      ...getInitialPartyFormData(),
      name: toTitleCase(partyQuery || prev.name || '')
    }));
    setPartyPopupError('');
    setIsPartyDropdownOpen(false);
    setShowPartyForm(true);
  };

  const closeInlinePartyForm = (shouldRefocusParty = true) => {
    setShowPartyForm(false);
    setPartyFormData(getInitialPartyFormData());
    setPartyPopupError('');

    if (!shouldRefocusParty) return;

    requestAnimationFrame(() => {
      partyInputRef.current?.focus();
      partyInputRef.current?.select?.();
      setIsPartyDropdownOpen(true);
    });
  };

  const handlePartyPopupChange = (event) => {
    const { name, value } = event.target;

    if (name === 'name') {
      setPartyFormData((prev) => ({ ...prev, [name]: toTitleCase(value) }));
      return;
    }

    if (name === 'mobile') {
      const normalized = String(value || '').replace(/\D/g, '').slice(0, 10);
      setPartyFormData((prev) => ({ ...prev, [name]: normalized }));
      return;
    }

    if (name === 'pincode') {
      const normalized = String(value || '').replace(/\D/g, '').slice(0, 6);
      setPartyFormData((prev) => ({ ...prev, [name]: normalized }));
      return;
    }

    if (name === 'openingBalance') {
      setPartyFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }

    if (['tenMmRate', 'twentyMmRate', 'fortyMmRate', 'wmmRate', 'gsbRate', 'dustRate'].includes(name)) {
      setPartyFormData((prev) => ({ ...prev, [name]: value }));
      return;
    }

    if (name === 'type') {
      setPartyFormData((prev) => ({
        ...prev,
        [name]: value,
        openingBalanceType: prev.openingBalance ? prev.openingBalanceType : (value === 'supplier' ? 'payable' : 'receivable')
      }));
      return;
    }

    setPartyFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePartyPopupSubmit = async (event) => {
    event.preventDefault();

    if (!String(partyFormData.name || '').trim()) {
      setPartyPopupError('Party name is required');
      return;
    }

    if (!['supplier', 'customer', 'cash-in-hand'].includes(partyFormData.type)) {
      setPartyPopupError('Party type is required');
      return;
    }

    setPartyPopupLoading(true);
    try {
      const payload = {
        type: String(partyFormData.type || '').trim(),
        name: String(partyFormData.name || '').trim(),
        mobile: String(partyFormData.mobile || '').trim(),
        email: String(partyFormData.email || '').trim(),
        address: String(partyFormData.address || '').trim(),
        state: String(partyFormData.state || '').trim(),
        pincode: String(partyFormData.pincode || '').trim(),
        openingBalance: Number(partyFormData.openingBalance || 0),
        openingBalanceType: String(partyFormData.openingBalanceType || 'receivable'),
        tenMmRate: Number(partyFormData.tenMmRate || 0),
        twentyMmRate: Number(partyFormData.twentyMmRate || 0),
        fortyMmRate: Number(partyFormData.fortyMmRate || 0),
        wmmRate: Number(partyFormData.wmmRate || 0),
        gsbRate: Number(partyFormData.gsbRate || 0),
        dustRate: Number(partyFormData.dustRate || 0)
      };

      const createdParty = await apiClient.post('/parties', payload);
      setParties((prev) => [
        createdParty,
        ...prev.filter((item) => String(item._id) !== String(createdParty._id))
      ]);
      selectParty(createdParty);
      toast.success('Party created successfully');
      closeInlinePartyForm(true);
    } catch (error) {
      setPartyPopupError(error.message || 'Error creating party');
    } finally {
      setPartyPopupLoading(false);
    }
  };

  const handlePartyInputKeyDown = (event) => {
    if (event.key === 'Control' && !event.altKey && !event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      openInlinePartyForm();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      setIsPartyDropdownOpen(true);
      if (filteredPartyOptions.length === 0) return;
      setPartyListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, filteredPartyOptions.length - 1);
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      setIsPartyDropdownOpen(true);
      if (filteredPartyOptions.length === 0) return;
      setPartyListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.max(prev - 1, 0);
      });
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();

      if (!isPartyDropdownOpen) {
        setIsPartyDropdownOpen(true);
        return;
      }

      const activeOption = partyListIndex >= 0 ? filteredPartyOptions[partyListIndex] : null;
      const exactMatch = parties.find((party) => getPartyLabel(party).toLowerCase() === partyQuery.trim().toLowerCase());
      const matchedOption = activeOption || exactMatch || filteredPartyOptions[0] || null;

      if (matchedOption) {
        selectParty(matchedOption, true);
      }
      return;
    }

    if (event.key === 'Escape' && isPartyDropdownOpen) {
      event.preventDefault();
      event.stopPropagation();
      setPartyQuery(getPartyLabel(selectedParty));
      setIsPartyDropdownOpen(false);
    }
  };

  const handleVehicleTypeFocus = () => {
    setIsVehicleTypeDropdownOpen(true);
    setVehicleTypeQuery(getVehicleTypeLabel(formData.vehicleType));
    const selectedIndex = VEHICLE_TYPE_OPTIONS.findIndex((option) => option.value === formData.vehicleType);
    setVehicleTypeListIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const handleVehicleTypeInputChange = (event) => {
    const nextValue = event.target.value;
    setVehicleTypeQuery(nextValue);
    setIsVehicleTypeDropdownOpen(true);

    const exactMatch = VEHICLE_TYPE_OPTIONS.find((option) => option.label.toLowerCase() === nextValue.trim().toLowerCase());
    if (exactMatch) {
      setVehicleTypeValue(exactMatch.value);
    }
  };

  const selectVehicleType = (option, moveNext = false) => {
    if (!option) return;

    setVehicleTypeValue(option.value);
    setVehicleTypeQuery(option.label);
    setVehicleTypeListIndex(Math.max(VEHICLE_TYPE_OPTIONS.findIndex((item) => item.value === option.value), 0));
    setIsVehicleTypeDropdownOpen(false);

    if (moveNext) {
      focusNextField(vehicleTypeInputRef.current);
    }
  };

  const handleVehicleTypeInputKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      setIsVehicleTypeDropdownOpen(true);
      if (filteredVehicleTypeOptions.length === 0) return;
      setVehicleTypeListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, filteredVehicleTypeOptions.length - 1);
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      setIsVehicleTypeDropdownOpen(true);
      if (filteredVehicleTypeOptions.length === 0) return;
      setVehicleTypeListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.max(prev - 1, 0);
      });
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();

      if (!isVehicleTypeDropdownOpen) {
        setIsVehicleTypeDropdownOpen(true);
        return;
      }

      const activeOption = vehicleTypeListIndex >= 0 ? filteredVehicleTypeOptions[vehicleTypeListIndex] : null;
      const exactMatch = VEHICLE_TYPE_OPTIONS.find((option) => option.label.toLowerCase() === vehicleTypeQuery.trim().toLowerCase());
      const matchedOption = activeOption || exactMatch || filteredVehicleTypeOptions[0] || null;

      if (matchedOption) {
        selectVehicleType(matchedOption, true);
      }
      return;
    }

    if (event.key === 'Escape' && isVehicleTypeDropdownOpen) {
      event.preventDefault();
      event.stopPropagation();
      setVehicleTypeQuery(getVehicleTypeLabel(formData.vehicleType));
      setIsVehicleTypeDropdownOpen(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.partyId) newErrors.partyId = 'Please select an owner / party';
    if (!String(formData.vehicleNo || '').trim()) newErrors.vehicleNo = 'Vehicle number is required';
    if (!String(formData.unladenWeight || '').trim()) newErrors.unladenWeight = 'Unladen weight is required';
    if (!formData.vehicleType) newErrors.vehicleType = 'Please select vehicle type';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        partyId: formData.partyId,
        vehicleNo: String(formData.vehicleNo || '').toUpperCase(),
        unladenWeight: parseFloat(formData.unladenWeight),
        vehicleType: formData.vehicleType || 'sales'
      };

      if (isEditing) {
        await apiClient.put(`/vehicles/${vehicle._id}`, payload);
        toast.success('Vehicle updated successfully');
      } else {
        await apiClient.post('/vehicles', payload);
        toast.success('Vehicle created successfully');
      }

      if (onSave) onSave();
      if (onClose) onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-[1.5px] md:p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-[42rem] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200/80 md:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex-shrink-0 border-b border-white/15 bg-gradient-to-r from-cyan-700 via-blue-700 to-indigo-700 px-3 py-1.5 text-white md:px-4 md:py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20 text-white ring-1 ring-white/30 md:h-8 md:w-8">
                <Truck className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold md:text-xl">{isEditing ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
                <p className="mt-0.5 text-[11px] text-cyan-100 md:text-xs">Create or update vehicle details in a simple format.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white transition hover:bg-white/25 md:p-2"
              aria-label="Close popup"
            >
              <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form
          id="vehicle-form"
          onSubmit={handleSubmit}
          onKeyDown={(event) => handlePopupFormKeyDown(event, onClose)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-2.5 md:p-4">
            <div className="flex flex-col gap-3 md:gap-4">
              {(errors.partyId || errors.vehicleNo || errors.unladenWeight || errors.vehicleType) ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  Please fix the highlighted vehicle fields.
                </div>
              ) : null}

              <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-2.5 md:p-4">
                <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800 md:mb-4 md:text-lg">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white md:h-8 md:w-8 md:text-sm">1</span>
                  Vehicle Details
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] md:gap-x-2 md:gap-y-4">
                  <div className="min-w-0">
                    <label htmlFor="vehicle-number-input" className="mb-1.5 block text-xs font-semibold text-gray-700 sm:text-sm">
                      Vehicle Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="vehicle-number-input"
                      type="text"
                      name="vehicleNo"
                      value={formData.vehicleNo}
                      onChange={handleChange}
                      className={`${getInlineFieldClass('indigo')} font-mono uppercase`}
                      placeholder="Enter vehicle number"
                      autoFocus
                      required
                    />
                    {errors.vehicleNo ? <p className="mt-1 text-xs text-red-500">{errors.vehicleNo}</p> : null}
                  </div>

                  <div className="min-w-0">
                    <label htmlFor="vehicle-type-input" className="mb-1.5 block text-xs font-semibold text-gray-700 sm:text-sm">
                      Vehicle Type <span className="text-red-500">*</span>
                    </label>
                    <div
                      ref={vehicleTypeSectionRef}
                      className="relative min-w-0 w-full"
                      onBlurCapture={(event) => {
                        const nextFocused = event.relatedTarget;
                        if (vehicleTypeSectionRef.current && nextFocused instanceof Node && vehicleTypeSectionRef.current.contains(nextFocused)) return;
                        setVehicleTypeQuery(getVehicleTypeLabel(formData.vehicleType));
                        setIsVehicleTypeDropdownOpen(false);
                      }}
                    >
                      <div className="relative">
                        <input
                          id="vehicle-type-input"
                          ref={vehicleTypeInputRef}
                          type="text"
                          value={vehicleTypeQuery}
                          onChange={handleVehicleTypeInputChange}
                          onFocus={handleVehicleTypeFocus}
                          onKeyDown={handleVehicleTypeInputKeyDown}
                          className={`${getInlineFieldClass('indigo')} pr-10`}
                          placeholder="Choose vehicle type"
                          autoComplete="off"
                          required
                        />
                        <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500 transition-transform ${isVehicleTypeDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>

                      {isVehicleTypeDropdownOpen && vehicleTypeDropdownStyle && (
                        <div className="fixed z-[80] overflow-hidden rounded-xl border border-amber-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]" style={vehicleTypeDropdownStyle} onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center justify-between border-b border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-2">
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Type List</span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm">{(filteredVehicleTypeOptions.length > 0 ? filteredVehicleTypeOptions : VEHICLE_TYPE_OPTIONS).length}</span>
                          </div>
                          <div className="overflow-y-auto py-1" style={{ maxHeight: vehicleTypeDropdownStyle.maxHeight }}>
                            {(filteredVehicleTypeOptions.length > 0 ? filteredVehicleTypeOptions : VEHICLE_TYPE_OPTIONS).map((option, index) => {
                              const isActive = index === vehicleTypeListIndex;
                              const isSelected = String(formData.vehicleType || '') === String(option.value);
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onMouseEnter={() => setVehicleTypeListIndex(index)}
                                  onClick={() => selectVehicleType(option, true)}
                                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition ${isActive ? 'bg-yellow-200 text-amber-950' : isSelected ? 'bg-yellow-50 text-amber-800' : 'text-slate-700 hover:bg-amber-50'}`}
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-medium">{option.label}</p>
                                    <p className={`mt-0.5 text-[11px] ${isActive ? 'text-amber-900' : isSelected ? 'text-amber-700' : 'text-slate-500'}`}>{option.description}</p>
                                  </div>
                                  {isSelected ? <span className="shrink-0 rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Selected</span> : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    {errors.vehicleType ? <p className="mt-1 text-xs text-red-500">{errors.vehicleType}</p> : null}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-green-50 to-emerald-50 p-2.5 md:p-4">
                <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800 md:mb-4 md:text-lg">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white md:h-8 md:w-8 md:text-sm">2</span>
                  Ownership Details
                </h3>

                <div className="min-w-0">
                  <div className="relative mb-1 min-h-[16px]">
                    <label htmlFor="vehicle-party-input" className="block text-xs font-semibold text-gray-700 sm:text-sm">
                      Owner / Party <span className="text-red-500">*</span>
                    </label>
                    {isPartyDropdownOpen && (
                      <button
                        type="button"
                        onClick={openInlinePartyForm}
                        className="absolute right-0 -top-2 inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-50"
                      >
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[9px] text-emerald-700">Ctrl</span>
                        New Party
                      </button>
                    )}
                  </div>
                  <div
                    ref={partySectionRef}
                    className="relative min-w-0 w-full"
                    onBlurCapture={(event) => {
                      const nextFocused = event.relatedTarget;
                      if (partySectionRef.current && nextFocused instanceof Node && partySectionRef.current.contains(nextFocused)) return;
                      setPartyQuery(getPartyLabel(selectedParty));
                      setIsPartyDropdownOpen(false);
                    }}
                  >
                    <div className="relative">
                      <input
                        id="vehicle-party-input"
                        ref={partyInputRef}
                        type="text"
                        value={partyQuery}
                        onChange={handlePartyInputChange}
                        onFocus={handlePartyFocus}
                        onKeyDown={handlePartyInputKeyDown}
                        className={`${getInlineFieldClass('emerald')} pr-10`}
                        placeholder="Choose owner / party"
                        autoComplete="off"
                        required
                      />
                      <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500 transition-transform ${isPartyDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {isPartyDropdownOpen && partyDropdownStyle && (
                      <div className="fixed z-[80] overflow-hidden rounded-xl border border-amber-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]" style={partyDropdownStyle} onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-2">
                          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Party List</span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm">{(filteredPartyOptions.length > 0 ? filteredPartyOptions : parties).length}</span>
                        </div>
                        <div className="overflow-y-auto py-1" style={{ maxHeight: partyDropdownStyle.maxHeight }}>
                          {(filteredPartyOptions.length > 0 ? filteredPartyOptions : parties).length === 0 ? (
                            <div className="px-3 py-3 text-center text-[13px] text-slate-500">
                              <p>No matching parties found.</p>
                              <button
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={openInlinePartyForm}
                                className="mt-2 inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                              >
                                Create New Party
                                <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-emerald-700">Ctrl</span>
                              </button>
                            </div>
                          ) : (
                            (filteredPartyOptions.length > 0 ? filteredPartyOptions : parties).map((party, index) => {
                              const isActive = index === partyListIndex;
                              const isSelected = String(formData.partyId || '') === String(party._id);
                              return (
                                <button
                                  key={party._id}
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onMouseEnter={() => setPartyListIndex(index)}
                                  onClick={() => selectParty(party, true)}
                                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition ${isActive ? 'bg-yellow-200 text-amber-950' : isSelected ? 'bg-yellow-50 text-amber-800' : 'text-slate-700 hover:bg-amber-50'}`}
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-medium">{getPartyLabel(party)}</p>
                                    <p className={`mt-0.5 text-[11px] ${isActive ? 'text-amber-900' : isSelected ? 'text-amber-700' : 'text-slate-500'}`}>{party.mobile ? `Mobile: ${party.mobile}` : 'Party account'}</p>
                                  </div>
                                  {isSelected ? <span className="shrink-0 rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Selected</span> : null}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.partyId ? <p className="mt-1 text-xs text-red-500">{errors.partyId}</p> : null}
                </div>
              </div>

              <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-2.5 md:p-4">
                <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-800 md:mb-4 md:text-lg">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-xs text-white md:h-8 md:w-8 md:text-sm">3</span>
                  Weight Details
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                    <label htmlFor="vehicle-unladen-weight-input" className="shrink-0 text-xs font-semibold text-gray-700 sm:w-32 sm:text-sm">Unladen Weight</label>
                    <div className="relative flex-1">
                      <input
                        id="vehicle-unladen-weight-input"
                        type="number"
                        name="unladenWeight"
                        value={formData.unladenWeight}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        className={`${getInlineFieldClass('emerald')} pr-12`}
                        placeholder="0.00"
                        required
                      />
                      <Scale className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" />
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col justify-center gap-1 rounded-lg bg-white/60 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Unit</p>
                    <p className="text-sm font-bold text-slate-800">Kilogram (kg)</p>
                    <p className="text-xs text-slate-500">Store the empty vehicle weight used in weighbridge calculations.</p>
                  </div>
                </div>
                {errors.unladenWeight ? <p className="mt-2 text-xs text-red-500">{errors.unladenWeight}</p> : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-3 py-2 md:flex-row md:px-4">
            <div className="text-[11px] text-gray-600 md:text-xs">
              <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-mono">Esc</kbd> to close
            </div>

            <div className="flex w-full gap-2 md:w-auto">
              <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 md:flex-none md:px-5">Cancel</button>
              <button type="submit" form="vehicle-form" disabled={loading} className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-1.5 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 md:flex-none md:px-6">
                {loading ? 'Saving...' : isEditing ? 'Update Vehicle' : 'Save Vehicle'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <AddPartyPopup
        showForm={showPartyForm}
        editingId={null}
        loading={partyPopupLoading}
        formData={partyFormData}
        error={partyPopupError}
        handleCloseForm={() => closeInlinePartyForm(true)}
        handleSubmit={handlePartyPopupSubmit}
        handleChange={handlePartyPopupChange}
      />
    </div>
  );
}
