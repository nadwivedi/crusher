import { useEffect, useRef, useState, useCallback } from 'react';
import { Building2, CalendarDays, Package, Truck, Camera, Upload, Loader2, Eye, AlertCircle, Check, X } from 'lucide-react';
import apiClient from '../../../utils/api';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { useFloatingDropdownPosition } from '../../../utils/useFloatingDropdownPosition';
import DocumentScannerPreview from '../../../components/DocumentScannerPreview';

export default function AddSalePopup({
  showForm,
  editingId,
  loading,
  isCashParty,
  formData,
  currentItem,
  products,
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
  const inputClass = "w-full rounded-lg border border-slate-400 bg-white px-2.5 py-1.5 text-[13px] text-gray-800 transition placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2";
  const labelClass = "mb-1 block text-[11px] font-semibold text-gray-700 md:text-xs";
  const currentItemTotal = Math.max(0, Number(currentItem.quantity || 0) * Number(currentItem.unitPrice || 0));
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[2px] md:items-center md:p-6" onClick={handleCancel}>
      <div className="relative flex h-[100dvh] max-h-[100dvh] w-full max-w-[30rem] md:max-w-[64rem] flex-col overflow-hidden rounded-none border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)] md:h-auto md:max-h-[95vh] md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[linear-gradient(135deg,#2563eb_0%,#4338ca_55%,#7c3aed_100%)] px-4 py-3 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold md:text-lg">
              {editingId ? 'Edit Sale Entry' : 'Add New Sale'}
            </h2>
            <div className="flex items-center gap-2">
              {onOcrFill && (
                <>
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
                </>
              )}
              <button type="button" onClick={handleCancel} className="rounded-lg p-1.5 text-white transition hover:bg-white/20">
                <X className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* OCR Overlay */}
        {isOcrLoading && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/80 backdrop-blur-sm">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold text-indigo-700">Extracting data with AI...</p>
          </div>
        )}

        {/* Scanner Preview */}
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

        <form id="sales-form" onSubmit={handleSubmit} onKeyDown={(e) => handlePopupFormKeyDown(e, handleCancel)} className="flex flex-1 flex-col overflow-hidden bg-slate-50">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            
            {/* Section 1: Primary Details (Blue) */}
            <div className="rounded-2xl border border-blue-200 bg-white p-3 shadow-sm transition hover:shadow-md">
              <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-blue-900">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">1</span>
                Primary Details
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Invoice Date */}
                <div className="space-y-1">
                  <label className={labelClass}>Invoice Date</label>
                  <div className="relative">
                    <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input type="date" name="saleDate" value={formData.saleDate} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} autoFocus className={`${inputClass} pl-9 focus:ring-blue-500`} />
                  </div>
                </div>

                {/* Vehicle No */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>Vehicle No</label>
                    <button type="button" onClick={onOpenNewVehicle} className="text-[10px] font-bold text-blue-600 hover:underline">+ New Vehicle</button>
                  </div>
                  <div ref={vehicleSectionRef} className="relative">
                    <input ref={vehicleInputRef} type="text" name="vehicleNo" value={vehicleQuery} onChange={handleVehicleInputChange} onKeyDown={handleVehicleInputKeyDown} autoComplete="off" className={`${inputClass} focus:ring-blue-500 uppercase`} placeholder="Type vehicle no..." />
                    {isVehicleSectionActive && vehicleDropdownStyle && (
                      <div className="fixed z-[80] overflow-hidden rounded-xl border border-blue-200 bg-white shadow-xl" style={vehicleDropdownStyle}>
                        <div className="bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700 uppercase">Vehicles ({filteredVehicles.length})</div>
                        <div className="overflow-y-auto py-1" style={{ maxHeight: vehicleDropdownStyle.maxHeight }}>
                          {filteredVehicles.length === 0 ? <div className="px-3 py-2 text-xs text-slate-500">No vehicles found</div> : filteredVehicles.map((v, i) => (
                            <button key={v._id} type="button" onMouseDown={e => e.preventDefault()} onMouseEnter={() => setVehicleListIndex(i)} onClick={() => { selectVehicle(v); setIsVehicleSectionActive(false); }} className={`w-full px-3 py-2 text-left text-xs ${i === vehicleListIndex ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-50'}`}>{getVehicleDisplayName(v)}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Party Name */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>Party Name</label>
                    <button type="button" onClick={onOpenNewParty} className="text-[10px] font-bold text-blue-600 hover:underline">+ New Party</button>
                  </div>
                  <div ref={leadgerSectionRef} className="relative">
                    <input ref={leadgerInputRef} type="text" value={leadgerQuery} onChange={handleLeadgerInputChange} onKeyDown={handleLeadgerInputKeyDown} className={`${inputClass} focus:ring-blue-500`} placeholder="Type party name..." autoComplete="off" />
                    {isLeadgerSectionActive && leadgerDropdownStyle && (
                      <div className="fixed z-[80] overflow-hidden rounded-xl border border-blue-200 bg-white shadow-xl" style={leadgerDropdownStyle}>
                        <div className="bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700 uppercase">Parties ({filteredLeadgers.length})</div>
                        <div className="overflow-y-auto py-1" style={{ maxHeight: leadgerDropdownStyle.maxHeight }}>
                          {filteredLeadgers.length === 0 ? <div className="px-3 py-2 text-xs text-slate-500">No parties found</div> : filteredLeadgers.map((l, i) => (
                            <button key={l._id} type="button" onMouseDown={e => e.preventDefault()} onMouseEnter={() => setLeadgerListIndex(i)} onClick={() => selectLeadger(l)} className={`w-full px-3 py-2 text-left text-xs ${i === leadgerListIndex ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-50'}`}>{getLeadgerDisplayName(l)}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Time Details Row (Only if slip exists) */}
              {formData?.slipImg && (
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="space-y-1">
                    <label className={labelClass}>Entry Time</label>
                    <input type="time" name="entryTime" value={formData.entryTime || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} className={`${inputClass} focus:ring-blue-500`} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Exit Time</label>
                    <input type="time" name="exitTime" value={formData.exitTime || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} className={`${inputClass} focus:ring-blue-500`} />
                  </div>
                </div>
              )}

              {ocrVehicleMismatch && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-800 flex justify-between items-center">
                  <span>OCR read "{ocrVehicleMismatch.ocrValue}", matched last-4 digits with "{ocrVehicleMismatch.matchedValue}"</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { handleVehicleInputChange({ target: { value: ocrVehicleMismatch.ocrValue } }); setOcrVehicleMismatch(null); }} className="px-2 py-1 bg-white border border-amber-300 rounded font-bold">Use OCR</button>
                    <button type="button" onClick={() => setOcrVehicleMismatch(null)} className="px-2 py-1 bg-amber-600 text-white rounded font-bold">Use Matched</button>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Material & Weight Details (Emerald) */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-3 shadow-sm transition hover:shadow-md">
              <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-emerald-900">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">2</span>
                Material & Weight Details
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {/* Material Type */}
                  <div className="space-y-1">
                    <label className={labelClass}>Material Type</label>
                    <div ref={materialSectionRef} className="relative">
                      <input ref={materialInputRef} type="text" value={materialQuery} onChange={handleMaterialInputChange} onKeyDown={handleMaterialInputKeyDown} className={`${inputClass} focus:ring-emerald-500`} placeholder="Search material..." autoComplete="off" />
                      {isMaterialSectionActive && materialDropdownStyle && (
                        <div className="fixed z-[80] overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-xl" style={materialDropdownStyle}>
                          <div className="bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700 uppercase">Materials ({filteredMaterialTypes.length})</div>
                          <div className="overflow-y-auto py-1" style={{ maxHeight: materialDropdownStyle.maxHeight }}>
                            {filteredMaterialTypes.map((m, i) => (
                              <button key={m.value} type="button" onMouseDown={e => e.preventDefault()} onMouseEnter={() => setMaterialListIndex(i)} onClick={() => { handleMaterialInputChange({ target: { value: getMaterialDisplayName(m) } }); setIsMaterialSectionActive(false); }} className={`w-full px-3 py-2 text-left text-xs ${i === materialListIndex ? 'bg-emerald-100 text-emerald-900' : 'text-slate-700 hover:bg-slate-50'}`}>{getMaterialDisplayName(m)}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Sale Basis */}
                  <div className="space-y-1">
                    <label className={labelClass}>Sale Basis</label>
                    <div ref={basisSectionRef} className="relative">
                      <input ref={basisInputRef} type="text" value={getSaleBasisDisplayName(formData.pricingMode || 'per_ton')} onFocus={handleBasisFocus} onClick={handleBasisFocus} onKeyDown={handleBasisInputKeyDown} readOnly className={`${inputClass} cursor-pointer focus:ring-emerald-500`} />
                      {isBasisSectionActive && (
                        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-xl">
                          {[{ v: 'per_ton', l: 'Per Ton' }, { v: 'per_cubic_meter', l: 'Per Cubic Meter' }].map((opt, i) => (
                            <button key={opt.v} type="button" onMouseDown={e => e.preventDefault()} onMouseEnter={() => setBasisListIndex(i)} onClick={() => { selectPricingMode(opt.v); setIsBasisSectionActive(false); }} className={`w-full px-3 py-2 text-left text-xs ${i === basisListIndex ? 'bg-emerald-100 text-emerald-900' : 'text-slate-700 hover:bg-slate-50'}`}>{opt.l}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Weight Inputs */}
                {formData.pricingMode === 'per_ton' ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <label className={labelClass}>Gross Weight (KG)</label>
                      <input type="number" name="grossWeight" value={formData.grossWeight || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} className={`${inputClass} focus:ring-emerald-500`} placeholder="0" step="0.01" />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Tare Weight (KG)</label>
                      <input type="number" name="tareWeight" value={formData.tareWeight || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} className={`${inputClass} focus:ring-emerald-500`} placeholder="0" step="0.01" />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Net Weight (KG)</label>
                      <input type="number" name="netWeight" value={formData.netWeight || ''} readOnly className={`${inputClass} bg-emerald-50/50 font-bold text-emerald-700`} placeholder="0" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className={labelClass}>Cubic Meter Qty (M3)</label>
                    <input type="number" name="cubicMeterQty" value={formData.cubicMeterQty || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} className={`${inputClass} focus:ring-emerald-500`} placeholder="0.00" step="0.01" />
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Pricing & Payment Details (Purple) */}
            <div className="rounded-2xl border border-purple-200 bg-purple-50/30 p-3 shadow-sm transition hover:shadow-md">
              <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-purple-900">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white">3</span>
                Pricing & Payment Details
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className={labelClass}>{formData.pricingMode === 'per_ton' ? 'Rate Per Ton' : 'Rate Per M3'}</label>
                    <input type="number" name="rate" value={formData.rate || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} className={`${inputClass} focus:ring-purple-500 font-bold`} placeholder="0.00" step="0.01" />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Total Amount</label>
                    <input type="number" name="totalAmount" value={formData.totalAmount || 0} readOnly className={`${inputClass} bg-purple-50/50 font-bold text-purple-700`} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Paid Amount</label>
                    <input ref={paidAmountInputRef} type="number" name="paidAmount" value={formData.paidAmount || ''} onChange={handleInputChange} onKeyDown={handlePaidAmountEnterSubmit} className={`${inputClass} focus:ring-purple-500 font-bold text-emerald-700`} placeholder="0.00" step="0.01" />
                  </div>
                </div>

                <div className="rounded-xl border border-purple-100 bg-white/50 px-3 py-2 text-[11px] text-slate-600">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-800">{saleTypePreview || 'Credit Sale'}</span>
                    <span className="font-bold">Bal: <span className={Number(formData.totalAmount || 0) - Number(formData.paidAmount || 0) < 0 ? 'text-rose-600' : 'text-slate-950'}>Rs {(Number(formData.totalAmount || 0) - Number(formData.paidAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
                  </div>
                </div>

                {formData?.slipImg && (
                  <div className="mt-2">
                    <label className={labelClass}>Slip Preview</label>
                    <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white">
                      {isSlipPreviewImage ? <img src={formData.slipImg} alt="Slip" className="h-32 w-full object-cover" /> : <div className="h-32 flex items-center justify-center text-xs text-slate-400">Slip Document</div>}
                      <a href={formData.slipImg} target="_blank" rel="noreferrer" className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1"><Eye className="h-4 w-4" /> View Full Slip</a>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
            <div className="hidden md:block text-[10px] text-slate-400">Press <kbd className="rounded bg-slate-100 px-1 py-0.5 border">Esc</kbd> to cancel</div>
            <div className="flex gap-2 w-full md:w-auto">
              <button type="button" onClick={handleCancel} className="flex-1 md:flex-none px-6 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 md:flex-none px-8 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-sm font-bold text-white shadow-lg hover:shadow-blue-500/30 transition disabled:opacity-50">
                {loading ? 'Saving...' : (editingId ? 'Update Sale' : 'Save Sale')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
