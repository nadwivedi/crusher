import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, ChevronDown, Eye, Loader2, Upload } from 'lucide-react';
import apiClient from '../../../utils/api';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { useFloatingDropdownPosition } from '../../../utils/useFloatingDropdownPosition';
import DocumentScannerPreview from '../../../components/DocumentScannerPreview';
import AccountSelect from '../../../components/AccountSelect';
import FormPopup from '../../../components/FormPopup';
import FormSection from '../../../components/FormSection';
import OptionList from '../../../components/OptionList';
import {
  TRANSPORT_BASIS_OPTIONS,
  VEHICLE_OWNERSHIP_OPTIONS,
  getBasisLabel,
  getBasisUnit,
  getOwnershipLabel,
  getSaleTransport,
  getSaleTransportCharge
} from '../../../utils/transport';

const SALE_BASIS_OPTIONS = [
  { value: 'per_ton', label: 'Per Ton' },
  { value: 'per_cubic_meter', label: 'Per Cubic Meter' }
];

const HEADER_BUTTON_CLASS = 'flex items-center gap-1.5 rounded-lg bg-white/15 px-2 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/25 disabled:opacity-60 md:px-3 md:text-xs';
// Worked out for the user, not typed
const COMPUTED_CLASS = 'input bg-slate-50 font-semibold';
const PREFIX_CLASS = 'pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400';
const SUFFIX_CLASS = 'pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400';

const formatAmount = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AddSalePopup({
  showForm,
  editingId,
  loading,
  error = '',
  isCashParty,
  formData,
  currentItem,
  products,
  accounts = [],
  defaultAccountId = '',
  popupFieldClass,
  popupLabelClass,
  leadgerSectionRef,
  leadgerInputRef,
  vehicleSectionRef,
  vehicleInputRef,
  materialSectionRef,
  materialInputRef,
  basisSectionRef,
  basisInputRef,
  productSectionRef,
  productInputRef,
  leadgerQuery,
  vehicleQuery,
  materialQuery,
  productQuery,
  leadgerListIndex,
  vehicleListIndex,
  materialListIndex,
  basisListIndex,
  productListIndex,
  filteredLeadgers,
  filteredVehicles,
  filteredMaterialTypes,
  filteredProducts,
  isLeadgerSectionActive,
  isVehicleSectionActive,
  isMaterialSectionActive,
  isBasisSectionActive,
  isProductSectionActive,
  setCurrentItem,
  setIsLeadgerSectionActive,
  setIsVehicleSectionActive,
  setIsMaterialSectionActive,
  setIsBasisSectionActive,
  setIsProductSectionActive,
  setLeadgerListIndex,
  setVehicleListIndex,
  setMaterialListIndex,
  setBasisListIndex,
  setProductListIndex,
  getLeadgerDisplayName,
  getVehicleDisplayName,
  getMaterialDisplayName,
  getProductDisplayName,
  handleCancel,
  handleSubmit,
  handleInputChange,
  saleTypePreview,
  pendingAmountPreview,
  excessAmountPreview,
  handleLeadgerFocus,
  handleLeadgerInputChange,
  handleLeadgerInputKeyDown,
  handleVehicleFocus,
  handleVehicleInputChange,
  handleVehicleInputKeyDown,
  handleMaterialFocus,
  handleMaterialInputChange,
  handleMaterialInputKeyDown,
  handleBasisFocus,
  handleBasisInputKeyDown,
  getSaleBasisDisplayName,
  selectPricingMode,
  transportParties = [],
  tripLocations = [],
  selectTransportMode,
  onOpenNewVehicle,
  onOpenNewParty,
  handleProductFocus,
  handleProductInputChange,
  handleProductInputKeyDown,
  onOpenNewProduct,
  handleSelectEnterMoveNext,
  handleAddItem,
  handleRemoveItem,
  selectLeadger,
  selectVehicle,
  selectProduct,
  onOcrFill,
  ocrVehicleMismatch,
  setOcrVehicleMismatch
}) {
  const localProductInputRef = useRef(null);
  const paidAmountInputRef = useRef(null);
  const ocrFileInputRef = useRef(null);
  const ocrCameraInputRef = useRef(null);
  const [isItemEntryClosed, setIsItemEntryClosed] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrMode, setOcrMode] = useState(''); // 'camera' | 'upload'
  const [scannerFile, setScannerFile] = useState(null);
  const isSlipPreviewImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(String(formData?.slipImg || ''));

  const uploadSlipFile = useCallback(async (file) => {
    const body = new FormData();
    body.append('slip', file);

    const response = await apiClient.post('/uploads/slip', body, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response?.url || response?.relativePath || '';
  }, []);

  const sendImageToOcr = useCallback(async (file) => {
    if (!file || !onOcrFill) return;
    setIsOcrLoading(true);
    try {
      const slipImg = await uploadSlipFile(file);
      onOcrFill({ slipImg });
      const fd = new FormData();
      fd.append('image', file);
      const baseURL = String(apiClient.defaults.baseURL || '/api').replace(/\/+$/, '');
      const response = await fetch(`${baseURL}/ocr/extract-sale`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'OCR failed' }));
        throw new Error(err.message || 'OCR failed');
      }
      const data = await response.json();
      onOcrFill({ ...data, slipImg });
    } catch (err) {
      console.error('OCR error:', err);
      alert(`Scan failed: ${err.message}`);
    } finally {
      setIsOcrLoading(false);
      setOcrMode('');
    }
  }, [onOcrFill, uploadSlipFile]);

  const handleOcrFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setScannerFile(file);
  }, []);

  const handleOcrCameraChange = useCallback((e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setScannerFile(file);
  }, []);
  const currentItemTotal = Math.max(0, Number(currentItem.quantity || 0) * Number(currentItem.unitPrice || 0));
  const transportMode = formData.transportMode || 'party';
  const transportCharge = getSaleTransportCharge(formData);
  const saleTransport = getSaleTransport(formData);
  const transportUnit = getBasisUnit(formData.transportBasis);
  const saleBalance = Number(formData.totalAmount || 0) - Number(formData.paidAmount || 0);
  const resolvedProductInputRef = productInputRef || localProductInputRef;
  const leadgerDropdownStyle = useFloatingDropdownPosition(leadgerSectionRef, isLeadgerSectionActive, [filteredLeadgers.length, leadgerListIndex]);
  const vehicleDropdownStyle = useFloatingDropdownPosition(vehicleSectionRef, isVehicleSectionActive, [filteredVehicles.length, vehicleListIndex]);
  const materialDropdownStyle = useFloatingDropdownPosition(materialSectionRef, isMaterialSectionActive, [filteredMaterialTypes.length, materialListIndex]);
  const productDropdownStyle = useFloatingDropdownPosition(productSectionRef, isProductSectionActive, [filteredProducts.length, productListIndex]);
  
  useEffect(() => {
    if (showForm) {
      setIsItemEntryClosed(false);
    }
  }, [showForm, editingId]);

  if (!showForm) return null;

  const handlePaidAmountEnterSubmit = (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.form?.requestSubmit();
  };

  return (
    <>
      <FormPopup
        formId="sales-form"
        title={editingId ? 'Edit Sale' : 'Add Sale'}
        subtitle="Material sold to a party"
        submitLabel={loading ? 'Saving...' : editingId ? 'Update Sale' : 'Save Sale'}
        submitDisabled={loading}
        maxWidth="max-w-5xl"
        onSubmit={handleSubmit}
        onClose={handleCancel}
        onKeyDown={(event) => handlePopupFormKeyDown(event, handleCancel)}
        headerActions={onOcrFill && (
          <>
            <input ref={ocrCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleOcrCameraChange} tabIndex={-1} />
            <input ref={ocrFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleOcrFileChange} tabIndex={-1} />
            <button type="button" onClick={() => { setOcrMode('camera'); ocrCameraInputRef.current?.click(); }} disabled={isOcrLoading} className={HEADER_BUTTON_CLASS}>
              {isOcrLoading && ocrMode === 'camera' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              Scan Slip
            </button>
            <button type="button" onClick={() => { setOcrMode('upload'); ocrFileInputRef.current?.click(); }} disabled={isOcrLoading} className={HEADER_BUTTON_CLASS}>
              {isOcrLoading && ocrMode === 'upload' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Upload Slip
            </button>
          </>
        )}
      >
        {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

        <FormSection number={1} title="Sale Details" tone="blue">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label" htmlFor="sale-date-input">Invoice Date</label>
              <input id="sale-date-input" className="input" type="date" name="saleDate" value={formData.saleDate} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} autoFocus />
            </div>

            <div>
              <label className="label" htmlFor="sale-invoice-input">Invoice / Slip No</label>
              <input
                id="sale-invoice-input"
                className="input uppercase placeholder:normal-case"
                type="text"
                name="invoiceNumber"
                value={formData.invoiceNumber || ''}
                onChange={handleInputChange}
                onKeyDown={handleSelectEnterMoveNext}
                maxLength={40}
                autoComplete="off"
                placeholder={editingId ? 'Keep current' : 'Auto if left blank'}
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="label mb-0" htmlFor="sale-vehicle-input">Vehicle No <span className="text-rose-500">*</span></label>
                <button type="button" onClick={onOpenNewVehicle} className="text-xs font-semibold text-primary-600 hover:underline">+ New Vehicle</button>
              </div>
              <div ref={vehicleSectionRef} className="relative" onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsVehicleSectionActive(false); }}>
                <input id="sale-vehicle-input" ref={vehicleInputRef} className="input pr-10 uppercase placeholder:normal-case" type="text" name="vehicleNo" value={vehicleQuery} onFocus={handleVehicleFocus} onChange={handleVehicleInputChange} onKeyDown={handleVehicleInputKeyDown} autoComplete="off" placeholder="Type vehicle no..." />
                <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isVehicleSectionActive ? 'rotate-180' : ''}`} />
                {isVehicleSectionActive && vehicleDropdownStyle && (
                  <OptionList
                    style={vehicleDropdownStyle}
                    options={filteredVehicles}
                    activeIndex={vehicleListIndex}
                    emptyText="No vehicle found. It is added when you save."
                    getKey={(vehicle) => vehicle._id}
                    getLabel={getVehicleDisplayName}
                    getHint={(vehicle) => (vehicle.ownership && vehicle.ownership !== 'party' ? getOwnershipLabel(vehicle.ownership) : '')}
                    isSelected={(vehicle) => String(formData.vehicleId || '') === String(vehicle._id)}
                    onHover={setVehicleListIndex}
                    onPick={(vehicle) => {
                      selectVehicle(vehicle);
                      setIsVehicleSectionActive(false);
                    }}
                  />
                )}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="label mb-0" htmlFor="sale-party-input">Party Name <span className="text-rose-500">*</span></label>
                <button type="button" onClick={onOpenNewParty} className="text-xs font-semibold text-primary-600 hover:underline">+ New Party</button>
              </div>
              <div ref={leadgerSectionRef} className="relative" onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsLeadgerSectionActive(false); }}>
                <input id="sale-party-input" ref={leadgerInputRef} className="input pr-10" type="text" value={leadgerQuery} onFocus={handleLeadgerFocus} onChange={handleLeadgerInputChange} onKeyDown={handleLeadgerInputKeyDown} placeholder="Type party name..." autoComplete="off" />
                <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isLeadgerSectionActive ? 'rotate-180' : ''}`} />
                {isLeadgerSectionActive && leadgerDropdownStyle && (
                  <OptionList
                    style={leadgerDropdownStyle}
                    options={filteredLeadgers}
                    activeIndex={leadgerListIndex}
                    emptyText="No matching party found."
                    getKey={(party) => party._id}
                    getLabel={getLeadgerDisplayName}
                    isSelected={(party) => String(formData.party || '') === String(party._id)}
                    onHover={setLeadgerListIndex}
                    onPick={(party) => {
                      selectLeadger(party);
                      setIsLeadgerSectionActive(false);
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Weighbridge times come with a scanned slip */}
          {formData?.slipImg && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div>
                <label className="label" htmlFor="sale-entry-time-input">Entry Time</label>
                <input id="sale-entry-time-input" className="input" type="time" name="entryTime" value={formData.entryTime || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} />
              </div>
              <div>
                <label className="label" htmlFor="sale-exit-time-input">Exit Time</label>
                <input id="sale-exit-time-input" className="input" type="time" name="exitTime" value={formData.exitTime || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} />
              </div>
            </div>
          )}

          {ocrVehicleMismatch && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span>The slip reads &quot;{ocrVehicleMismatch.ocrValue}&quot;. Matched by the last 4 digits to &quot;{ocrVehicleMismatch.matchedValue}&quot;.</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => { handleVehicleInputChange({ target: { value: ocrVehicleMismatch.ocrValue } }); setOcrVehicleMismatch(null); }} className="btn-secondary btn-sm">Use Slip Number</button>
                <button type="button" onClick={() => setOcrVehicleMismatch(null)} className="btn-primary btn-sm">Keep Matched</button>
              </div>
            </div>
          )}
        </FormSection>

        <FormSection number={2} title="Material & Weight" tone="emerald">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="sale-material-input">Material Type <span className="text-rose-500">*</span></label>
              <div ref={materialSectionRef} className="relative" onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsMaterialSectionActive(false); }}>
                <input id="sale-material-input" ref={materialInputRef} className="input pr-10" type="text" value={materialQuery} onFocus={handleMaterialFocus} onChange={handleMaterialInputChange} onKeyDown={handleMaterialInputKeyDown} placeholder="Search material..." autoComplete="off" />
                <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isMaterialSectionActive ? 'rotate-180' : ''}`} />
                {isMaterialSectionActive && materialDropdownStyle && (
                  <OptionList
                    style={materialDropdownStyle}
                    options={filteredMaterialTypes}
                    activeIndex={materialListIndex}
                    emptyText="No matching material found."
                    getKey={(material) => material.value}
                    getLabel={getMaterialDisplayName}
                    isSelected={(material) => formData.materialType === material.value}
                    onHover={setMaterialListIndex}
                    onPick={(material) => {
                      handleMaterialInputChange({ target: { value: getMaterialDisplayName(material) } });
                      setIsMaterialSectionActive(false);
                    }}
                  />
                )}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="sale-basis-input">Sale Basis</label>
              <div ref={basisSectionRef} className="relative">
                <input id="sale-basis-input" ref={basisInputRef} className="input cursor-pointer pr-10" type="text" value={getSaleBasisDisplayName(formData.pricingMode || 'per_ton')} onFocus={handleBasisFocus} onClick={handleBasisFocus} onKeyDown={handleBasisInputKeyDown} readOnly />
                <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isBasisSectionActive ? 'rotate-180' : ''}`} />
                {isBasisSectionActive && (
                  <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg bg-white py-1 shadow-xl ring-1 ring-slate-200">
                    {SALE_BASIS_OPTIONS.map((option, index) => (
                      <button
                        key={option.value}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setBasisListIndex(index)}
                        onClick={() => { selectPricingMode(option.value); setIsBasisSectionActive(false); }}
                        className={`w-full px-3 py-2 text-left text-sm font-medium transition ${index === basisListIndex ? 'bg-primary-50 text-primary-900' : 'text-slate-700'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {formData.pricingMode === 'per_ton' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="sale-gross-input">Gross Weight</label>
                <div className="relative">
                  <input id="sale-gross-input" className="input pr-10" type="number" name="grossWeight" value={formData.grossWeight || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} placeholder="0" step="0.01" />
                  <span className={SUFFIX_CLASS}>kg</span>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="sale-tare-input">Tare Weight</label>
                <div className="relative">
                  <input id="sale-tare-input" className="input pr-10" type="number" name="tareWeight" value={formData.tareWeight || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} placeholder="0" step="0.01" />
                  <span className={SUFFIX_CLASS}>kg</span>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="sale-net-input">Net Weight</label>
                <div className="relative">
                  <input id="sale-net-input" className={`${COMPUTED_CLASS} pr-10 text-emerald-700`} type="number" name="netWeight" value={formData.netWeight || ''} readOnly placeholder="0" />
                  <span className={SUFFIX_CLASS}>kg</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="label" htmlFor="sale-cubic-input">Cubic Meter Qty</label>
              <div className="relative sm:max-w-xs">
                <input id="sale-cubic-input" className="input pr-10" type="number" name="cubicMeterQty" value={formData.cubicMeterQty || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} placeholder="0" step="0.01" />
                <span className={SUFFIX_CLASS}>m³</span>
              </div>
            </div>
          )}
        </FormSection>

        <FormSection
          number={3}
          title="Transport"
          tone="amber"
          hint={transportMode === 'party'
            ? 'The party takes the material in their own vehicle, so there is no transport charge.'
            : transportMode === 'own'
              ? 'This charge is added to the sale total and billed to the party.'
              : undefined}
        >
          <div className="grid grid-cols-3 gap-2">
            {VEHICLE_OWNERSHIP_OPTIONS.map((option) => {
              const active = transportMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectTransportMode(option.value)}
                  aria-pressed={active}
                  className={`rounded-lg border px-1 py-2 text-center transition sm:px-3 sm:text-left ${active ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
                >
                  <span className="block text-xs font-semibold sm:text-sm">{option.label}</span>
                  <span className={`mt-0.5 hidden text-[11px] sm:block ${active ? 'text-primary-100' : 'text-slate-400'}`}>{option.hint}</span>
                </button>
              );
            })}
          </div>

          {transportMode !== 'party' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {transportMode === 'hired' && (
                <>
                  <div>
                    <label className="label" htmlFor="sale-transporter-input">Transporter <span className="text-rose-500">*</span></label>
                    <select id="sale-transporter-input" className="input" name="transporterId" value={formData.transporterId || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext}>
                      <option value="">Select transporter</option>
                      {transportParties.map((party) => (
                        <option key={party._id} value={party._id}>{getLeadgerDisplayName(party)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="sale-transport-basis-input">Pay Transporter</label>
                    <select id="sale-transport-basis-input" className="input" name="transportBasis" value={formData.transportBasis || 'per_ton'} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext}>
                      {TRANSPORT_BASIS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  {formData.transportBasis === 'per_trip' && (
                    <div>
                      <label className="label" htmlFor="sale-transport-location-input">Location</label>
                      {tripLocations.length > 0 ? (
                        <select id="sale-transport-location-input" className="input" name="transportLocation" value={formData.transportLocation || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext}>
                          <option value="">Select location</option>
                          {/* A location since removed from the vehicle stays pickable on an older sale */}
                          {formData.transportLocation && !tripLocations.some((row) => row.location === formData.transportLocation) && (
                            <option value={formData.transportLocation}>{formData.transportLocation}</option>
                          )}
                          {tripLocations.map((row) => (
                            <option key={row.location} value={row.location}>{row.location} · ₹{Number(row.rate || 0).toLocaleString('en-IN')}</option>
                          ))}
                        </select>
                      ) : (
                        <input id="sale-transport-location-input" className="input" type="text" name="transportLocation" value={formData.transportLocation || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} placeholder="Where it went" autoComplete="off" />
                      )}
                    </div>
                  )}
                  {!saleTransport.isPeriod && (
                    <>
                      {formData.transportBasis !== 'fixed' && (
                        <div>
                          <label className="label" htmlFor="sale-transport-qty-input">{transportUnit === 'km' ? 'Distance' : transportUnit === 'trip' ? 'Trips' : 'Quantity'}</label>
                          <div className="relative">
                            {saleTransport.qtyAuto ? (
                              <input id="sale-transport-qty-input" className={`${COMPUTED_CLASS} pr-10`} type="number" value={saleTransport.qty || ''} readOnly placeholder="From net weight" />
                            ) : (
                              <input id="sale-transport-qty-input" className="input pr-10" type="number" name="transportQty" value={formData.transportQty || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} placeholder={transportUnit === 'trip' ? '1' : '0'} step="0.01" min="0" />
                            )}
                            <span className={SUFFIX_CLASS}>{transportUnit}</span>
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="label" htmlFor="sale-transport-rate-input">{formData.transportBasis === 'fixed' ? 'Amount To Transporter' : 'Transporter Rate'}</label>
                        <div className="relative">
                          <span className={PREFIX_CLASS}>₹</span>
                          <input id="sale-transport-rate-input" className={`input pl-7 ${transportUnit ? 'pr-14' : ''}`} type="number" name="transportRate" value={formData.transportRate || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} placeholder="0" step="0.01" min="0" />
                          {transportUnit && <span className={SUFFIX_CLASS}>/{transportUnit}</span>}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
              <div>
                <label className="label" htmlFor="sale-transport-charge-input">Transport Charge To Party</label>
                <div className="relative">
                  <span className={PREFIX_CLASS}>₹</span>
                  <input id="sale-transport-charge-input" className="input pl-7 font-semibold" type="number" name="transportCharge" value={formData.transportCharge || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} placeholder="0" step="0.01" min="0" />
                </div>
              </div>
            </div>
          )}

          {transportMode === 'hired' && (
            <div className="rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-600 ring-1 ring-inset ring-amber-200">
              {saleTransport.isPeriod ? (
                <span>This vehicle is on <span className="font-semibold text-slate-800">{getBasisLabel(formData.transportBasis).toLowerCase()}</span> rent, so nothing is added for this trip. Enter the rent from the Transport page.</span>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span>You pay transporter: <span className="font-bold text-rose-600">{formatAmount(saleTransport.cost)}</span></span>
                  <span>Party pays you: <span className="font-bold text-emerald-700">{formatAmount(transportCharge)}</span></span>
                  <span>Transport margin: <span className={`font-bold ${transportCharge - saleTransport.cost < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatAmount(transportCharge - saleTransport.cost)}</span></span>
                </div>
              )}
            </div>
          )}
        </FormSection>

        <FormSection number={4} title="Pricing & Payment" tone="indigo">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label" htmlFor="sale-rate-input">{formData.pricingMode === 'per_ton' ? 'Rate Per Ton' : 'Rate Per M³'}</label>
              <div className="relative">
                <span className={PREFIX_CLASS}>₹</span>
                <input id="sale-rate-input" className="input pl-7 font-semibold" type="number" name="rate" value={formData.rate || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} placeholder="0" step="0.01" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="sale-total-input">Total Amount</label>
              <div className="relative">
                <span className={PREFIX_CLASS}>₹</span>
                <input id="sale-total-input" className={`${COMPUTED_CLASS} pl-7 text-primary-700`} type="number" name="totalAmount" value={formData.totalAmount || 0} readOnly />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="sale-paid-input">Paid Amount</label>
              <div className="relative">
                <span className={PREFIX_CLASS}>₹</span>
                <input id="sale-paid-input" ref={paidAmountInputRef} className="input pl-7 font-semibold text-emerald-700" type="number" name="paidAmount" value={formData.paidAmount || ''} onChange={handleInputChange} onKeyDown={handlePaidAmountEnterSubmit} placeholder="0" step="0.01" />
              </div>
            </div>
            <div>
              <label className="label">Received In</label>
              <AccountSelect accounts={accounts} defaultAccountId={defaultAccountId} value={formData.account} onChange={handleInputChange} className="input" />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-600 ring-1 ring-inset ring-indigo-200">
            <span>
              <span className="font-semibold text-slate-800">{saleTypePreview || 'Credit'} sale</span>
              {transportCharge > 0 && (
                <span className="ml-2">Material {formatAmount(Number(formData.totalAmount || 0) - transportCharge)} + Transport {formatAmount(transportCharge)}</span>
              )}
            </span>
            <span className="font-semibold">
              Balance: <span className={saleBalance < 0 ? 'text-rose-600' : 'text-slate-900'}>{formatAmount(saleBalance)}</span>
            </span>
          </div>

          {formData?.slipImg && (
            <div>
              <p className="label">Slip</p>
              <div className="group relative overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
                {isSlipPreviewImage ? <img src={formData.slipImg} alt="Slip" className="h-32 w-full object-cover" /> : <div className="flex h-32 items-center justify-center text-xs text-slate-400">Slip document</div>}
                <a href={formData.slipImg} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center gap-1 bg-slate-900/40 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100"><Eye className="h-4 w-4" /> View Full Slip</a>
              </div>
            </div>
          )}
        </FormSection>
      </FormPopup>

      {/* Covers everything while the slip is being read */}
      {isOcrLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
          <p className="text-sm font-semibold text-primary-700">Reading the slip...</p>
        </div>
      )}

      {scannerFile && (
        <DocumentScannerPreview
          file={scannerFile}
          onCancel={() => setScannerFile(null)}
          onConfirm={async (processedFile) => {
            setScannerFile(null);
            await sendImageToOcr(processedFile);
          }}
        />
      )}
    </>
  );
}
