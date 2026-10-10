import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../../utils/api';
import FormPopup from '../../../components/FormPopup';
import FormSection from '../../../components/FormSection';
import AddPartyPopup from '../../Party/component/AddPartyPopup';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { useFloatingDropdownPosition } from '../../../utils/useFloatingDropdownPosition';
import { VEHICLE_CATEGORY_OPTIONS, VEHICLE_OWNERSHIP_OPTIONS, getSupplierRatesPayload, isTransportProvider } from '../../../utils/transport';

const initialFormData = {
  partyId: '',
  vehicleNo: '',
  category: 'truck',
  vehicleType: 'sales',
  ownership: 'own'
};

// A vehicle is either mine or hired from a transporter; party vehicles are not added here
const OWNERSHIP_OPTIONS = VEHICLE_OWNERSHIP_OPTIONS.filter((option) => option.value !== 'party');

const ACTIVE_OPTION_CLASS = 'border-primary-600 bg-primary-600 text-white';
const INACTIVE_OPTION_CLASS = 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100';

const getPartyLabel = (party) => party?.partyName || party?.name || '';

const getInitialPartyFormData = (type = 'customer') => ({
  type,
  name: '',
  mobile: '',
  email: '',
  address: '',
  state: '',
  pincode: '',
  openingBalance: '',
  openingBalanceType: type === 'customer' ? 'receivable' : 'payable',
  tenMmRate: '',
  twentyMmRate: '',
  fortyMmRate: '',
  wmmRate: '',
  gsbRate: '',
  dustRate: '',
  boulderRatePerTon: '',
  boulderRatePerTrip: '',
  isTransportProvider: false,
  hireBasis: 'per_ton',
  hireRate: '',
  tripRates: []
});


const toTitleCase = (value) => String(value || '')
  .toLowerCase()
  .replace(/\b[a-z]/g, (char) => char.toUpperCase());

/** Add or edit a vehicle. Opened from the vehicle master and from the sale and boulder forms. */
export default function AddVehiclePopup({ vehicle, onClose, onSave, onVehicleSaved = null, defaultVehicleType = 'sales' }) {
  const [formData, setFormData] = useState(vehicle || initialFormData);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [partyQuery, setPartyQuery] = useState('');
  const [partyListIndex, setPartyListIndex] = useState(0);
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const [showPartyForm, setShowPartyForm] = useState(false);
  const [partyFormData, setPartyFormData] = useState(getInitialPartyFormData());
  const [partyPopupLoading, setPartyPopupLoading] = useState(false);
  const [partyPopupError, setPartyPopupError] = useState('');
  const partySectionRef = useRef(null);
  const partyInputRef = useRef(null);
  const isEditing = Boolean(vehicle?._id);
  // An older party vehicle has to be moved to one of the two kinds when it is edited
  const ownership = OWNERSHIP_OPTIONS.some((option) => option.value === formData.ownership) ? formData.ownership : '';
  const isOwnVehicle = ownership === 'own';
  const isHiredVehicle = ownership === 'hired';

  useEffect(() => {
    setFormData(vehicle || { ...initialFormData, vehicleType: defaultVehicleType || 'sales' });
  }, [defaultVehicleType, vehicle]);

  useEffect(() => {
    const fetchParties = async () => {
      try {
        const response = await apiClient.get('/parties');
        setParties(Array.isArray(response) ? response : []);
      } catch (fetchError) {
        console.error('Error fetching parties:', fetchError);
      }
    };

    fetchParties();
  }, []);

  // A hired vehicle is picked from transporters first; the cash party never owns a vehicle
  const partyOptions = useMemo(() => parties
    .filter((party) => party.type !== 'cash-in-hand')
    .sort((a, b) => (isHiredVehicle ? Number(isTransportProvider(b)) - Number(isTransportProvider(a)) : 0)),
  [parties, isHiredVehicle]);

  const selectedParty = useMemo(
    () => parties.find((party) => party._id === formData.partyId) || null,
    [formData.partyId, parties]
  );

  const filteredPartyOptions = useMemo(() => {
    const normalized = String(partyQuery || '').trim().toLowerCase();
    const selectedLabel = getPartyLabel(selectedParty).trim().toLowerCase();

    // Opening the list on an already picked party shows everything, not just that party
    if (!normalized || normalized === selectedLabel) return partyOptions;

    const startsWith = partyOptions.filter((party) => getPartyLabel(party).toLowerCase().startsWith(normalized));
    const includes = partyOptions.filter((party) => (
      !getPartyLabel(party).toLowerCase().startsWith(normalized)
      && getPartyLabel(party).toLowerCase().includes(normalized)
    ));

    return [...startsWith, ...includes];
  }, [partyOptions, partyQuery, selectedParty]);

  useEffect(() => {
    setPartyQuery(getPartyLabel(selectedParty));
  }, [selectedParty]);

  useEffect(() => {
    setPartyListIndex((prev) => Math.min(Math.max(prev, 0), filteredPartyOptions.length - 1));
  }, [filteredPartyOptions]);

  const partyDropdownStyle = useFloatingDropdownPosition(
    partySectionRef,
    isPartyDropdownOpen,
    [filteredPartyOptions.length, partyListIndex]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const selectOwnership = (value) => {
    setFormData((prev) => ({ ...prev, ownership: value, partyId: value === 'hired' ? prev.partyId : '' }));
    setError('');
  };

  const handlePartyFocus = () => {
    setIsPartyDropdownOpen(true);
    const selectedIndex = filteredPartyOptions.findIndex((party) => party._id === formData.partyId);
    setPartyListIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const handlePartyInputChange = (event) => {
    setPartyQuery(event.target.value);
    setIsPartyDropdownOpen(true);
    if (formData.partyId) {
      setFormData((prev) => ({ ...prev, partyId: '' }));
    }
    setError('');
  };

  const selectParty = (party) => {
    if (!party) return;

    setFormData((prev) => ({ ...prev, partyId: party._id }));
    setPartyQuery(getPartyLabel(party));
    setIsPartyDropdownOpen(false);
    setError('');

  };

  const openInlinePartyForm = () => {
    setPartyFormData({
      ...getInitialPartyFormData(isHiredVehicle ? 'supplier' : 'customer'),
      isTransportProvider: isHiredVehicle,
      name: selectedParty ? '' : toTitleCase(partyQuery)
    });
    setPartyPopupError('');
    setIsPartyDropdownOpen(false);
    setShowPartyForm(true);
  };

  const closeInlinePartyForm = () => {
    setShowPartyForm(false);
    setPartyPopupError('');
    requestAnimationFrame(() => partyInputRef.current?.focus());
  };

  const handlePartyPopupChange = (event) => {
    const { name, value } = event.target;

    if (name === 'name') {
      setPartyFormData((prev) => ({ ...prev, name: toTitleCase(value) }));
      return;
    }

    if (name === 'mobile') {
      setPartyFormData((prev) => ({ ...prev, mobile: String(value || '').replace(/\D/g, '').slice(0, 10) }));
      return;
    }

    if (name === 'type') {
      setPartyFormData((prev) => ({
        ...prev,
        type: value,
        openingBalanceType: prev.openingBalance ? prev.openingBalanceType : (['supplier', 'transporter'].includes(value) ? 'payable' : 'receivable')
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

    if (!['supplier', 'customer', 'transporter', 'cash-in-hand'].includes(partyFormData.type)) {
      setPartyPopupError('Party type is required');
      return;
    }

    setPartyPopupLoading(true);
    try {
      const createdParty = await apiClient.post('/parties', {
        type: partyFormData.type,
        name: String(partyFormData.name || '').trim(),
        mobile: String(partyFormData.mobile || '').trim(),
        openingBalance: Number(partyFormData.openingBalance || 0),
        openingBalanceType: String(partyFormData.openingBalanceType || 'receivable'),
        tenMmRate: Number(partyFormData.tenMmRate || 0),
        twentyMmRate: Number(partyFormData.twentyMmRate || 0),
        fortyMmRate: Number(partyFormData.fortyMmRate || 0),
        wmmRate: Number(partyFormData.wmmRate || 0),
        gsbRate: Number(partyFormData.gsbRate || 0),
        dustRate: Number(partyFormData.dustRate || 0),
        ...getSupplierRatesPayload(partyFormData)
      });
      setParties((prev) => [createdParty, ...prev.filter((item) => String(item._id) !== String(createdParty._id))]);
      setShowPartyForm(false);
      selectParty(createdParty, true);
      toast.success('Party created successfully');
    } catch (submitError) {
      setPartyPopupError(submitError.message || 'Error creating party');
    } finally {
      setPartyPopupLoading(false);
    }
  };

  const handlePartyInputKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      setIsPartyDropdownOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setPartyListIndex((prev) => Math.min(Math.max(prev + step, 0), filteredPartyOptions.length - 1));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();

      if (!isPartyDropdownOpen) {
        setIsPartyDropdownOpen(true);
        return;
      }

      const matchedOption = filteredPartyOptions[partyListIndex] || filteredPartyOptions[0] || null;
      if (matchedOption) selectParty(matchedOption, true);
      return;
    }

    if (event.key === 'Escape' && isPartyDropdownOpen) {
      event.preventDefault();
      event.stopPropagation();
      setPartyQuery(getPartyLabel(selectedParty));
      setIsPartyDropdownOpen(false);
    }
  };

  const handleSubmit = async () => {
    if (loading) return;

    if (!String(formData.vehicleNo || '').trim()) {
      setError('Vehicle number is required');
      return;
    }
    if (!ownership) {
      setError('Choose My Vehicle or Hired Vehicle');
      return;
    }
    if (isHiredVehicle && !formData.partyId) {
      setError('Please select the transporter');
      return;
    }

    setLoading(true);
    try {
      // Weights and what the vehicle is used for are filled in from the sale and boulder forms, so an edit leaves them alone
      const payload = {
        partyId: isHiredVehicle ? formData.partyId : '',
        vehicleNo: String(formData.vehicleNo || '').trim().toUpperCase(),
        category: formData.category || 'truck',
        ownership,
        ...(isEditing ? {} : { vehicleType: formData.vehicleType || 'sales' })
      };

      const savedVehicle = isEditing
        ? await apiClient.put(`/vehicles/${vehicle._id}`, payload)
        : await apiClient.post('/vehicles', payload);
      toast.success(isEditing ? 'Vehicle updated successfully' : 'Vehicle created successfully');

      if (typeof onVehicleSaved === 'function') onVehicleSaved(savedVehicle);
      if (onSave) onSave();
      if (onClose) onClose();
    } catch (submitError) {
      setError(/duplicate key/i.test(submitError?.error || '') ? 'This vehicle number is already added' : submitError?.message || 'Error saving vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FormPopup
        title={isEditing ? 'Edit Vehicle' : 'Add Vehicle'}
        subtitle="Your own vehicle, or one hired from a transporter"
        submitLabel={loading ? 'Saving...' : isEditing ? 'Update Vehicle' : 'Save Vehicle'}
        submitDisabled={loading}
        maxWidth="max-w-xl"
        onSubmit={handleSubmit}
        onClose={onClose}
        onKeyDown={(event) => handlePopupFormKeyDown(event, onClose)}
      >
        {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

        <FormSection number={1} title="Vehicle Details" tone="blue">
          <div>
            <div>
              <label className="label" htmlFor="vehicle-number-input">Vehicle Number <span className="text-rose-500">*</span></label>
              <input
                id="vehicle-number-input"
                className="input font-mono uppercase placeholder:font-sans placeholder:normal-case"
                type="text"
                name="vehicleNo"
                value={formData.vehicleNo}
                onChange={handleChange}
                placeholder="e.g. CG04AB1234"
                autoComplete="off"
                autoFocus
                required
              />
            </div>
          </div>
          <div>
            <span className="label">Vehicle Type</span>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {VEHICLE_CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, category: option.value }))}
                  aria-pressed={(formData.category || 'truck') === option.value}
                  className={`min-h-[2.5rem] whitespace-nowrap rounded-lg border px-2 py-2 text-sm font-semibold transition ${(formData.category || 'truck') === option.value ? ACTIVE_OPTION_CLASS : INACTIVE_OPTION_CLASS}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </FormSection>

        <FormSection number={2} title="Owner" tone="sky">
          <div>
            <div className="grid grid-cols-2 gap-2">
              {OWNERSHIP_OPTIONS.map((option) => {
                const active = ownership === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectOwnership(option.value)}
                    aria-pressed={active}
                    className={`rounded-lg border px-1 py-2 text-center transition sm:px-3 sm:text-left ${active ? ACTIVE_OPTION_CLASS : INACTIVE_OPTION_CLASS}`}
                  >
                    <span className="block text-xs font-semibold sm:text-sm">{option.label}</span>
                    <span className={`mt-0.5 hidden text-[11px] sm:block ${active ? 'text-primary-100' : 'text-slate-400'}`}>{option.hint}</span>
                  </button>
                );
              })}
            </div>
            {isOwnVehicle && (
              <p className="mt-1.5 text-xs text-slate-500">Your own vehicle. Add a transport charge on a sale, or give it on rent from the Transport page.</p>
            )}
          </div>

          {isHiredVehicle && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="label mb-0" htmlFor="vehicle-party-input">
                  Transporter <span className="text-rose-500">*</span>
                </label>
                {/* Keeping focus in the search box keeps the typed name, which becomes the new party's name */}
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={openInlinePartyForm} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline">
                  <Plus size={14} /> New Transporter
                </button>
              </div>
              <div
                ref={partySectionRef}
                className="relative"
                onBlurCapture={(event) => {
                  // The new-party popup takes the focus; the typed name must survive that
                  if (showPartyForm || partySectionRef.current?.contains(event.relatedTarget)) return;
                  setPartyQuery(getPartyLabel(selectedParty));
                  setIsPartyDropdownOpen(false);
                }}
              >
                <input
                  id="vehicle-party-input"
                  ref={partyInputRef}
                  className="input pr-10"
                  type="text"
                  value={partyQuery}
                  onChange={handlePartyInputChange}
                  onFocus={handlePartyFocus}
                  onKeyDown={handlePartyInputKeyDown}
                  placeholder="Type to search transporter"
                  autoComplete="off"
                />
                <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isPartyDropdownOpen ? 'rotate-180' : ''}`} />

                {isPartyDropdownOpen && partyDropdownStyle && (
                  <div className="fixed z-[80] overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-slate-200" style={partyDropdownStyle} onClick={(event) => event.stopPropagation()}>
                    <div className="overflow-y-auto py-1" style={{ maxHeight: partyDropdownStyle.maxHeight }}>
                      {filteredPartyOptions.length === 0 ? (
                        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={openInlinePartyForm} className="w-full px-3 py-2.5 text-left text-sm text-slate-500 hover:bg-slate-50">
                          No match. <span className="font-semibold text-primary-600">Add {partyQuery.trim() ? `"${toTitleCase(partyQuery.trim())}"` : 'a new party'}</span>
                        </button>
                      ) : filteredPartyOptions.map((party, index) => (
                        <button
                          key={party._id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setPartyListIndex(index)}
                          onClick={() => selectParty(party, true)}
                          className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${index === partyListIndex ? 'bg-primary-50 text-primary-900' : 'text-slate-700'}`}
                        >
                          <span className="min-w-0 truncate font-medium">{getPartyLabel(party)}</span>
                          <span className="shrink-0 text-[11px] capitalize text-slate-400">{party.type}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </FormSection>
      </FormPopup>

      <AddPartyPopup
        showForm={showPartyForm}
        editingId={null}
        loading={partyPopupLoading}
        formData={partyFormData}
        error={partyPopupError}
        handleCloseForm={closeInlinePartyForm}
        handleSubmit={handlePartyPopupSubmit}
        handleChange={handlePartyPopupChange}
      />
    </>
  );
}
