import { useEffect, useRef, useState } from 'react';
import { Building2, CalendarDays, Package, Truck } from 'lucide-react';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { useFloatingDropdownPosition } from '../../../utils/useFloatingDropdownPosition';

const MATERIAL_TYPES = [
  { value: '10mm', label: '10mm' },
  { value: '20mm', label: '20mm' },
  { value: '40mm', label: '40mm' },
  { value: 'gsb', label: 'GSB' },
  { value: 'wmm', label: 'WMM' },
];

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
  productSectionRef,
  productInputRef,
  leadgerQuery,
  productQuery,
  leadgerListIndex,
  productListIndex,
  filteredLeadgers,
  filteredProducts,
  isLeadgerSectionActive,
  isProductSectionActive,
  setCurrentItem,
  setIsLeadgerSectionActive,
  setIsProductSectionActive,
  setLeadgerListIndex,
  setProductListIndex,
  getLeadgerDisplayName,
  getProductDisplayName,
  handleCancel,
  handleSubmit,
  handleInputChange,
  handleLeadgerFocus,
  handleLeadgerInputChange,
  handleLeadgerInputKeyDown,
  onOpenNewParty,
  handleProductFocus,
  handleProductInputChange,
  handleProductInputKeyDown,
  onOpenNewProduct,
  handleSelectEnterMoveNext,
  handleAddItem,
  handleRemoveItem,
  selectLeadger,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-1 md:p-4" onClick={handleCancel}>
      <div className="flex h-[95dvh] max-h-[95dvh] w-[94vw] max-w-[68rem] flex-col overflow-hidden rounded-lg bg-white shadow-2xl md:h-[98vh] md:max-h-[99vh] md:w-full md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-2.5 py-2 text-white md:px-4 md:py-3">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold md:text-xl">
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
          <div className="flex-1 overflow-y-auto p-2 md:p-4">
            <div className="flex h-full flex-col gap-2.5 md:gap-4">
                <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-2 md:p-4">
                  <h3 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-gray-800 md:mb-3 md:text-base">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white md:h-6 md:w-6 md:text-xs">1</span>
                    Sale Details
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-3">
                  <div>
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

                  <div>
                    <label className={labelClass}>Vehicle No</label>
                    <div className="relative">
                      <Truck className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-400 pointer-events-none" />
                      <input
                        type="text"
                        name="vehicleNo"
                        value={formData.vehicleNo || ''}
                        onChange={handleInputChange}
                        onKeyDown={handleSelectEnterMoveNext}
                        className={`${inputClass} pl-9 focus:ring-indigo-500`}
                        placeholder="Enter vehicle number"
                      />
                    </div>
                  </div>

                  <div className="relative">
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

                  <div>
                    <label className={labelClass}>Material Type</label>
                    <select
                      name="materialType"
                      value={formData.materialType || ''}
                      onChange={handleInputChange}
                      onKeyDown={handleSelectEnterMoveNext}
                      className={`${inputClass} focus:ring-indigo-500`}
                    >
                      <option value="">Select Material</option>
                      {MATERIAL_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Vehicle Weight (KG)</label>
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

                  <div>
                    <label className={labelClass}>Net Weight (KG)</label>
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

                  <div>
                    <label className={labelClass}>Material Weight (KG)</label>
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
                </div>
                </div>

                <div className="flex flex-1 flex-col rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-green-50 to-emerald-50 p-2.5 md:p-4">
                  <h3 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-gray-800 md:mb-3 md:text-base">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white md:h-6 md:w-6 md:text-xs">2</span>
                    Sale Items
                  </h3>

                  <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm">
                    <div className="border-b border-emerald-100 bg-emerald-50 px-3 py-2">
                      <p className="text-xs font-semibold text-emerald-800">{formData.items.length} item(s) added</p>
                    </div>
                    <div className="flex-1 overflow-auto">
                      <table className="w-full min-w-[720px] table-fixed text-[13px]">
                        <colgroup>
                          <col className="w-[34%]" />
                          <col className="w-[10%]" />
                          <col className="w-[10%]" />
                          <col className="w-[21%]" />
                          <col className="w-[25%]" />
                        </colgroup>
                        <thead className="bg-white text-gray-600">
                          <tr>
                            <th className="border-b border-r border-slate-400 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider">Product</th>
                            <th className="border-b border-r border-slate-400 px-3 py-2 pr-12 text-right text-[11px] font-semibold uppercase tracking-wider">Qty</th>
                            <th className="border-b border-r border-slate-400 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider">Per</th>
                            <th className="border-b border-r border-slate-400 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider">Price</th>
                            <th className="border-b border-r border-slate-400 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-50">
                          {formData.items.map((item, index) => (
                            <tr key={index} className="hover:bg-emerald-50/40">
                              <td className="border-r border-slate-400 px-3 py-2.5 font-medium text-gray-800">{item.productName}</td>
                              <td className="border-r border-slate-400 px-3 py-2.5 pr-12 text-right text-gray-600">{item.quantity}</td>
                              <td className="border-r border-slate-400 px-3 py-2.5 text-center text-gray-600">{resolveItemUnit(item)}</td>
                              <td className="border-r border-slate-400 px-3 py-2.5 text-right text-gray-600">Rs {Number(item.unitPrice || 0).toFixed(2)}</td>
                              <td className="border-r border-slate-400 px-3 py-2.5 text-right font-semibold text-gray-800">Rs {Number(item.total || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                          {isItemEntryClosed ? (
                            <>
                              <tr className="bg-emerald-50/40">
                                <td colSpan={4} className="border-t border-emerald-200 px-3 py-3 text-right text-[12px] font-bold uppercase tracking-wide text-emerald-800">
                                  Total Amount
                                </td>
                                <td className="border-t border-emerald-200 px-3 py-3 text-right text-sm font-bold text-emerald-900">
                                  Rs {Number(formData.totalAmount || 0).toFixed(2)}
                                </td>
                              </tr>
                              {!isCashParty && (
                                <tr className="bg-white">
                                  <td colSpan={4} className="border-t border-emerald-100 px-3 py-3 text-right text-[12px] font-bold uppercase tracking-wide text-slate-700">
                                    Paid Amount
                                  </td>
                                  <td className="border-t border-emerald-100 px-3 py-2">
                                    <input
                                      ref={paidAmountInputRef}
                                      type="number"
                                      name="paidAmount"
                                      value={formData.paidAmount}
                                      onChange={handleInputChange}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Backspace' && !String(formData.paidAmount || '').trim()) {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          reopenItemEntryFromPaidAmount();
                                        }
                                      }}
                                      step="0.01"
                                      min="0"
                                      className={`${inputClass} text-right bg-white focus:ring-emerald-500`}
                                      placeholder="0.00"
                                    />
                                  </td>
                                </tr>
                              )}
                            </>
                          ) : (
                            <tr className="bg-emerald-50/50 align-top">
                              <td className="px-3 py-2.5">
                                <div
                                  ref={productSectionRef}
                                  className="relative"
                                  onFocusCapture={handleProductFocus}
                                  onBlurCapture={(event) => {
                                    const nextFocused = event.relatedTarget;
                                    if (productSectionRef.current && nextFocused instanceof Node && productSectionRef.current.contains(nextFocused)) return;
                                    setIsProductSectionActive(false);
                                  }}
                                >
                                  <div className="relative">
                                    <Package className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-500" />
                                    <input
                                      ref={resolvedProductInputRef}
                                      type="text"
                                      value={productQuery}
                                      onChange={handleProductInputChange}
                                      onKeyDown={(e) => handleProductInputKeyDown(e, closeItemEntryAndFocusPaidAmount)}
                                      className={`${inputClass} pl-9 focus:ring-emerald-500`}
                                      placeholder="Type to search product..."
                                      autoComplete="off"
                                    />
                                  </div>

                                  {isProductSectionActive && productDropdownStyle && (
                                    <div
                                      className="fixed z-[80] overflow-hidden rounded-xl border border-amber-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                                      style={productDropdownStyle}
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      <div className="flex items-center justify-between border-b border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-2">
                                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Product List</span>
                                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm">
                                          {filteredProducts.length}
                                        </span>
                                      </div>
                                      <div className="overflow-y-auto py-1" style={{ maxHeight: productDropdownStyle.maxHeight }}>
                                        {filteredProducts.length === 0 ? (
                                          <div className="px-3 py-3 text-center text-[13px] text-slate-500">
                                            <p>No matching products found.</p>
                                            <button
                                              type="button"
                                              onMouseDown={(event) => event.preventDefault()}
                                              onClick={onOpenNewProduct}
                                              className="mt-2 inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                                            >
                                              Create New Stock
                                              <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-emerald-700">Ctrl</span>
                                            </button>
                                          </div>
                                        ) : (
                                          filteredProducts.map((product, index) => {
                                            const isActive = index === productListIndex;
                                            const isSelected = String(currentItem.product || '') === String(product._id);

                                            return (
                                              <button
                                                key={product._id}
                                                type="button"
                                                onMouseDown={(event) => event.preventDefault()}
                                                onMouseEnter={() => setProductListIndex(index)}
                                                onClick={() => selectProduct(product)}
                                                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition ${
                                                  isActive
                                                    ? 'bg-yellow-200 text-amber-950'
                                                    : isSelected
                                                    ? 'bg-yellow-50 text-amber-800'
                                                    : 'text-slate-700 hover:bg-amber-50'
                                                }`}
                                              >
                                                <span className="truncate font-medium">{getProductDisplayName(product)}</span>
                                                {isSelected && (
                                                  <span className="shrink-0 rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                                    Selected
                                                  </span>
                                                )}
                                              </button>
                                            );
                                          })
                                        )}
                                        <button
                                          type="button"
                                          onMouseDown={(event) => event.preventDefault()}
                                          onMouseEnter={() => setProductListIndex(filteredProducts.length)}
                                          onClick={closeItemEntryAndFocusPaidAmount}
                                          className={`flex w-full items-center justify-between gap-3 border-t border-amber-100 px-3 py-2 text-left text-[13px] font-semibold transition ${
                                            productListIndex === filteredProducts.length
                                              ? 'bg-yellow-200 text-amber-950'
                                              : 'text-amber-800 hover:bg-amber-50'
                                          }`}
                                        >
                                          <span>End Item List</span>
                                          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                            End
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            <td className="px-3 py-2.5">
                              <input
                                type="number"
                                placeholder="0"
                                value={currentItem.quantity}
                                onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                                onKeyDown={handleSelectEnterMoveNext}
                                className={`${inputClass} ml-auto w-[22%] min-w-[44px] text-right focus:ring-emerald-500`}
                              />
                            </td>
                              <td className="px-3 py-2.5 text-center">
                                <div className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 font-medium text-gray-700">
                                  {currentItemUnit}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  value={currentItem.unitPrice}
                                  onChange={(e) => setCurrentItem({ ...currentItem, unitPrice: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const didAddItem = handleAddItem();
                                      if (!didAddItem) return;

                                      requestAnimationFrame(() => {
                                        resolvedProductInputRef.current?.focus();
                                        resolvedProductInputRef.current?.select?.();
                                      });
                                    }
                                  }}
                                  className={`${inputClass} text-right focus:ring-emerald-500`}
                                  step="0.01"
                                />
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <div className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 font-semibold text-gray-800">
                                  Rs {currentItemTotal.toFixed(2)}
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-3 py-2.5 md:flex-row md:px-4 md:py-3">
            <div className="text-[11px] text-gray-600 md:text-xs">
              <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> to close
            </div>

            <div className="flex w-full gap-2 md:w-auto">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 md:flex-none md:px-5"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="sales-form"
                disabled={loading}
                className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 md:flex-none md:px-6"
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
