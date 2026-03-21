import { useEffect, useRef, useState } from 'react';
import { Building2, CalendarDays, Package, Truck } from 'lucide-react';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { useFloatingDropdownPosition } from '../../../utils/useFloatingDropdownPosition';

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
  productSectionRef,
  productInputRef,
  leadgerQuery,
  vehicleQuery,
  materialQuery,
  productQuery,
  leadgerListIndex,
  vehicleListIndex,
  materialListIndex,
  productListIndex,
  filteredLeadgers,
  filteredVehicles,
  filteredMaterialTypes,
  filteredProducts,
  isLeadgerSectionActive,
  isVehicleSectionActive,
  isMaterialSectionActive,
  isProductSectionActive,
  setCurrentItem,
  setIsLeadgerSectionActive,
  setIsVehicleSectionActive,
  setIsMaterialSectionActive,
  setIsProductSectionActive,
  setLeadgerListIndex,
  setVehicleListIndex,
  setMaterialListIndex,
  setProductListIndex,
  getLeadgerDisplayName,
  getVehicleDisplayName,
  getMaterialDisplayName,
  getProductDisplayName,
  handleCancel,
  handleSubmit,
  handleInputChange,
  handleLeadgerFocus,
  handleLeadgerInputChange,
  handleLeadgerInputKeyDown,
  handleVehicleFocus,
  handleVehicleInputChange,
  handleVehicleInputKeyDown,
  handleMaterialFocus,
  handleMaterialInputChange,
  handleMaterialInputKeyDown,
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
  selectProduct
}) {
  const localProductInputRef = useRef(null);
  const paidAmountInputRef = useRef(null);
  const [isItemEntryClosed, setIsItemEntryClosed] = useState(false);
  const inputClass = "w-full rounded-lg border border-slate-400 bg-white px-2.5 py-1.5 text-[13px] text-gray-800 transition placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2";
  const labelClass = "mb-1 block text-[11px] font-semibold text-gray-700 md:text-xs";
  const currentItemTotal = Math.max(0, Number(currentItem.quantity || 0) * Number(currentItem.unitPrice || 0));
  const resolvedProductInputRef = productInputRef || localProductInputRef;
  const leadgerDropdownStyle = useFloatingDropdownPosition(leadgerSectionRef, isLeadgerSectionActive, [filteredLeadgers.length, leadgerListIndex]);
  const vehicleDropdownStyle = useFloatingDropdownPosition(vehicleSectionRef, isVehicleSectionActive, [filteredVehicles.length, vehicleListIndex]);
  const materialDropdownStyle = useFloatingDropdownPosition(materialSectionRef, isMaterialSectionActive, [filteredMaterialTypes.length, materialListIndex]);
  const productDropdownStyle = useFloatingDropdownPosition(productSectionRef, isProductSectionActive, [filteredProducts.length, productListIndex]);
  const resolveItemUnit = (item) => {
    const itemUnit = String(item?.unit || '').trim();
    if (itemUnit) return itemUnit;

    const matchingProduct = products.find((product) => String(product?._id) === String(item?.product || ''));
    return String(matchingProduct?.unit || '').trim() || '-';
  };
  const currentItemUnit = String(currentItem.unit || '').trim() || '-';

  useEffect(() => {
    if (showForm) {
      setIsItemEntryClosed(false);
    }
  }, [showForm, editingId]);

  if (!showForm) return null;

  const closeItemEntryRow = () => {
    selectProduct(null);
    setCurrentItem((prev) => ({
      ...prev,
      quantity: '',
      unitPrice: ''
    }));
    setIsProductSectionActive(false);
    setIsItemEntryClosed(true);
  };

  const closeItemEntryAndFocusPaidAmount = () => {
    closeItemEntryRow();
    requestAnimationFrame(() => {
      if (isCashParty) {
        const submitButton = resolvedProductInputRef.current
          ?.closest('form')
          ?.querySelector('button[type="submit"]:not([disabled])');
        submitButton?.focus();
        return;
      }
      paidAmountInputRef.current?.focus();
      paidAmountInputRef.current?.select?.();
    });
  };

  const reopenItemEntryFromPaidAmount = () => {
    setIsItemEntryClosed(false);
    setIsProductSectionActive(true);
    setProductListIndex(filteredProducts.length > 0 ? 0 : -1);
    requestAnimationFrame(() => {
      resolvedProductInputRef.current?.focus();
      resolvedProductInputRef.current?.select?.();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] md:p-6" onClick={handleCancel}>
      <div className="flex max-h-[88vh] w-full max-w-[30rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[linear-gradient(135deg,#2563eb_0%,#4338ca_55%,#7c3aed_100%)] px-4 py-3 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold md:text-lg">
              {editingId ? 'Edit Sale Entry' : 'Add New Sale'}
            </h2>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg p-1.5 text-white transition hover:bg-white/20"
              aria-label="Close popup"
            >
              <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form id="sales-form" onSubmit={handleSubmit} onKeyDown={(e) => handlePopupFormKeyDown(e, handleCancel)} className="flex flex-1 flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800 md:text-base">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">1</span>
                    Sale Details
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <label className={labelClass}>Invoice Date</label>
                    <div className="relative">
                      <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-400 pointer-events-none" />
                      <input
                        type="date"
                        name="saleDate"
                        value={formData.saleDate}
                        onChange={handleInputChange}
                        onKeyDown={handleSelectEnterMoveNext}
                        autoFocus
                        className={`${inputClass} pl-9 focus:ring-indigo-500`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="relative mb-1 min-h-[16px]">
                      <label className="block pr-24 text-[11px] font-semibold text-gray-700 md:text-xs">Vehicle No</label>
                      {isVehicleSectionActive && (
                        <button
                          type="button"
                          onClick={onOpenNewVehicle}
                          className="absolute right-0 -top-2 inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-1 text-[10px] font-semibold text-indigo-700 transition hover:bg-indigo-50"
                        >
                          <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[9px] text-indigo-700">Ctrl</span>
                          New Vehicle
                        </button>
                      )}
                    </div>
                    <div
                      ref={vehicleSectionRef}
                      className="relative"
                      onFocusCapture={handleVehicleFocus}
                      onBlurCapture={(event) => {
                        const nextFocused = event.relatedTarget;
                        if (vehicleSectionRef.current && nextFocused instanceof Node && vehicleSectionRef.current.contains(nextFocused)) return;
                        setIsVehicleSectionActive(false);
                      }}
                    >
                      <div className="relative">
                        <Truck className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-400 pointer-events-none" />
                        <input
                          ref={vehicleInputRef}
                          type="text"
                          name="vehicleNo"
                          value={vehicleQuery}
                          onChange={handleVehicleInputChange}
                          onKeyDown={handleVehicleInputKeyDown}
                          className={`${inputClass} pl-9 focus:ring-indigo-500`}
                          placeholder="Type to search vehicle..."
                          autoComplete="off"
                        />
                      </div>

                      {isVehicleSectionActive && vehicleDropdownStyle && (
                        <div
                          className="fixed z-[80] overflow-hidden rounded-xl border border-amber-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                          style={vehicleDropdownStyle}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="flex items-center justify-between border-b border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-2">
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Vehicle List</span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm">
                              {filteredVehicles.length}
                            </span>
                          </div>
                          <div className="overflow-y-auto py-1" style={{ maxHeight: vehicleDropdownStyle.maxHeight }}>
                            {filteredVehicles.length === 0 ? (
                              <div className="px-3 py-3 text-center text-[13px] text-slate-500">
                                <p>No matching vehicles found.</p>
                                <button
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={onOpenNewVehicle}
                                  className="mt-2 inline-flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[12px] font-semibold text-indigo-700 transition hover:bg-indigo-100"
                                >
                                  Create New Vehicle
                                  <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-indigo-700">Ctrl</span>
                                </button>
                              </div>
                            ) : (
                              filteredVehicles.map((vehicle, index) => {
                                const isActive = index === vehicleListIndex;
                                const isSelected = String(formData.vehicleNo || '') === String(getVehicleDisplayName(vehicle));

                                return (
                                  <button
                                    key={vehicle._id}
                                    type="button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onMouseEnter={() => setVehicleListIndex(index)}
                                    onClick={() => {
                                      selectVehicle(vehicle);
                                      setIsVehicleSectionActive(false);
                                    }}
                                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition ${
                                      isActive
                                        ? 'bg-yellow-200 text-amber-950'
                                        : isSelected
                                        ? 'bg-yellow-50 text-amber-800'
                                        : 'text-slate-700 hover:bg-amber-50'
                                    }`}
                                  >
                                    <span className="truncate font-medium">{getVehicleDisplayName(vehicle)}</span>
                                    {isSelected && (
                                      <span className="shrink-0 rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                        Selected
                                      </span>
                                    )}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative space-y-1">
                    <div className="relative mb-1 min-h-[16px]">
                      <label className="block pr-24 text-[11px] font-semibold text-gray-700 md:text-xs">Party Name</label>
                      {isLeadgerSectionActive && (
                        <button
                          type="button"
                          onClick={onOpenNewParty}
                          className="absolute right-0 -top-2 inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-1 text-[10px] font-semibold text-indigo-700 transition hover:bg-indigo-50"
                        >
                          <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[9px] text-indigo-700">Ctrl</span>
                          New Party
                        </button>
                      )}
                    </div>
                    <div
                      ref={leadgerSectionRef}
                      className="relative"
                      onFocusCapture={handleLeadgerFocus}
                      onBlurCapture={(event) => {
                        const nextFocused = event.relatedTarget;
                        if (leadgerSectionRef.current && nextFocused instanceof Node && leadgerSectionRef.current.contains(nextFocused)) return;
                        setIsLeadgerSectionActive(false);
                      }}
                    >
                        <div className="relative">
                        <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-400 pointer-events-none" />
                        <input
                          ref={leadgerInputRef}
                          type="text"
                          value={leadgerQuery}
                          onChange={handleLeadgerInputChange}
                          onKeyDown={handleLeadgerInputKeyDown}
                          className={`${inputClass} pl-9 focus:ring-indigo-500`}
                          placeholder="Type to search party..."
                          autoComplete="off"
                        />
                      </div>

                      {isLeadgerSectionActive && leadgerDropdownStyle && (
                        <div
                          className="fixed z-[80] overflow-hidden rounded-xl border border-amber-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                          style={leadgerDropdownStyle}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="flex items-center justify-between border-b border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-2">
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Party List</span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm">
                              {filteredLeadgers.length}
                            </span>
                          </div>
                          <div className="overflow-y-auto py-1" style={{ maxHeight: leadgerDropdownStyle.maxHeight }}>
                            {filteredLeadgers.length === 0 ? (
                              <div className="px-3 py-3 text-center text-[13px] text-slate-500">
                                <p>No matching parties found.</p>
                                <button
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={onOpenNewParty}
                                  className="mt-2 inline-flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[12px] font-semibold text-indigo-700 transition hover:bg-indigo-100"
                                >
                                  Create New Party
                                  <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-indigo-600">Ctrl</span>
                                </button>
                              </div>
                            ) : (
                              filteredLeadgers.map((leadger, index) => {
                                const isActive = index === leadgerListIndex;
                                const isSelected = String(formData.party || '') === String(leadger._id);

                                return (
                                  <button
                                    key={leadger._id}
                                    type="button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onMouseEnter={() => setLeadgerListIndex(index)}
                                    onClick={() => selectLeadger(leadger)}
                                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition ${
                                      isActive
                                        ? 'bg-yellow-200 text-amber-950'
                                        : isSelected
                                        ? 'bg-yellow-50 text-amber-800'
                                        : 'text-slate-700 hover:bg-amber-50'
                                    }`}
                                  >
                                    <span className="truncate font-medium">{getLeadgerDisplayName(leadger)}</span>
                                    {isSelected && (
                                      <span className="shrink-0 rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                        Selected
                                      </span>
                                    )}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={labelClass}>Material Type</label>
                    <div
                      ref={materialSectionRef}
                      className="relative"
                      onFocusCapture={handleMaterialFocus}
                      onBlurCapture={(event) => {
                        const nextFocused = event.relatedTarget;
                        if (materialSectionRef.current && nextFocused instanceof Node && materialSectionRef.current.contains(nextFocused)) return;
                        const selectedMaterial = filteredMaterialTypes.find((item) => String(item.value) === String(formData.materialType))
                          || (formData.materialType ? { value: formData.materialType, label: materialQuery } : null);
                        setIsMaterialSectionActive(false);
                        if (selectedMaterial) {
                          handleMaterialInputChange({ target: { value: getMaterialDisplayName(selectedMaterial) } });
                        }
                      }}
                    >
                      <div className="relative">
                        <input
                          ref={materialInputRef}
                          type="text"
                          value={materialQuery}
                          onChange={handleMaterialInputChange}
                          onKeyDown={handleMaterialInputKeyDown}
                          className={`${inputClass} pr-10 focus:ring-indigo-500`}
                          placeholder="Type to search material..."
                          autoComplete="off"
                        />
                      </div>

                      {isMaterialSectionActive && materialDropdownStyle && (
                        <div
                          className="fixed z-[80] overflow-hidden rounded-xl border border-amber-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                          style={materialDropdownStyle}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="flex items-center justify-between border-b border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-2">
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Material List</span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm">
                              {filteredMaterialTypes.length}
                            </span>
                          </div>
                          <div className="overflow-y-auto py-1" style={{ maxHeight: materialDropdownStyle.maxHeight }}>
                            {filteredMaterialTypes.length === 0 ? (
                              <div className="px-3 py-3 text-center text-[13px] text-slate-500">
                                No matching materials found.
                              </div>
                            ) : (
                              filteredMaterialTypes.map((material, index) => {
                                const isActive = index === materialListIndex;
                                const isSelected = String(formData.materialType || '') === String(material.value);

                                return (
                                  <button
                                    key={material.value}
                                    type="button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onMouseEnter={() => setMaterialListIndex(index)}
                                    onClick={() => {
                                      handleMaterialInputChange({ target: { value: getMaterialDisplayName(material) } });
                                      setIsMaterialSectionActive(false);
                                    }}
                                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition ${
                                      isActive
                                        ? 'bg-yellow-200 text-amber-950'
                                        : isSelected
                                        ? 'bg-yellow-50 text-amber-800'
                                        : 'text-slate-700 hover:bg-amber-50'
                                    }`}
                                  >
                                    <span className="truncate font-medium">{getMaterialDisplayName(material)}</span>
                                    {isSelected && (
                                      <span className="shrink-0 rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                        Selected
                                      </span>
                                    )}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={labelClass}>Gross Weight (KG)</label>
                      <input
                        type="number"
                        name="netWeight"
                        value={formData.netWeight || ''}
                        onChange={handleInputChange}
                        onKeyDown={handleSelectEnterMoveNext}
                        className={`${inputClass} focus:ring-indigo-500`}
                        placeholder="0"
                        step="0.01"
                        min="0"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className={labelClass}>Tare Weight (KG)</label>
                      <input
                        type="number"
                        name="vehicleWeight"
                        value={formData.vehicleWeight || ''}
                        onChange={handleInputChange}
                        onKeyDown={handleSelectEnterMoveNext}
                        className={`${inputClass} focus:ring-indigo-500`}
                        placeholder="0"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={labelClass}>Net Weight (KG)</label>
                    <input
                      type="number"
                      name="materialWeight"
                      value={formData.materialWeight || ''}
                      onChange={handleInputChange}
                      onKeyDown={handleSelectEnterMoveNext}
                      className={`${inputClass} focus:ring-indigo-500 bg-gray-50`}
                      placeholder="0"
                      step="0.01"
                      min="0"
                      readOnly
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={labelClass}>Rate Per Ton</label>
                    <input
                      type="number"
                      name="rate"
                      value={formData.rate || ''}
                      onChange={handleInputChange}
                      onKeyDown={handleSelectEnterMoveNext}
                      className={`${inputClass} focus:ring-indigo-500`}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={labelClass}>Total Amount</label>
                    <input
                      type="number"
                      name="totalAmount"
                      value={formData.totalAmount || 0}
                      readOnly
                      className={`${inputClass} bg-slate-100 font-semibold text-emerald-700 focus:ring-indigo-500`}
                    />
                  </div>
                </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 md:flex-row">
            <div className="hidden text-[11px] text-gray-600 md:block md:text-xs">
              <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> to close
            </div>

            <div className="flex w-full gap-2 md:w-auto">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-slate-50 md:flex-none md:px-5"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="sales-form"
                disabled={loading}
                className="flex-1 rounded-lg bg-[linear-gradient(135deg,#2563eb_0%,#4338ca_100%)] px-5 py-2 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 md:flex-none md:px-6"
              >
                {loading ? 'Saving...' : editingId ? 'Update Sale' : 'Save Sale'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
