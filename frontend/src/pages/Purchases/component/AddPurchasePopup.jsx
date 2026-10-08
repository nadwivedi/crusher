import { useEffect, useRef, useState } from 'react';
import { ChevronDown, FileCheck2, Plus, Trash2, Upload } from 'lucide-react';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { useFloatingDropdownPosition } from '../../../utils/useFloatingDropdownPosition';
import AccountSelect from '../../../components/AccountSelect';
import FormPopup from '../../../components/FormPopup';
import FormSection from '../../../components/FormSection';
import OptionList from '../../../components/OptionList';

const formatAmount = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TH = 'px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500';
const TD = 'px-3 py-2 text-sm text-slate-700';
const PREFIX_CLASS = 'pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400';

export default function AddPurchasePopup({
  showForm,
  editingId,
  loading,
  error = '',
  isCashParty,
  accounts = [],
  defaultAccountId = '',
  formData,
  currentItem,
  products,
  uploadingInvoice,
  leadgerSectionRef,
  leadgerInputRef,
  leadgerQuery,
  leadgerListIndex,
  filteredLeadgers,
  isLeadgerSectionActive,
  productSectionRef,
  productInputRef,
  productQuery,
  productListIndex,
  filteredProducts,
  isProductSectionActive,
  getLeadgerDisplayName,
  getProductDisplayName,
  setCurrentItem,
  setIsLeadgerSectionActive,
  setLeadgerListIndex,
  setIsProductSectionActive,
  setProductListIndex,
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
  handleInvoiceUpload,
  handleAddItem,
  handleRemoveItem,
  selectLeadger,
  selectProduct
}) {
  const localLeadgerInputRef = useRef(null);
  const localProductInputRef = useRef(null);
  const paidAmountInputRef = useRef(null);
  // The entry row is hidden once the user ends the item list and moves on to payment
  const [isItemEntryClosed, setIsItemEntryClosed] = useState(false);
  const currentItemTotal = Math.max(0, Number(currentItem.quantity || 0) * Number(currentItem.unitPrice || 0));
  const resolvedLeadgerInputRef = leadgerInputRef || localLeadgerInputRef;
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
  const paidAmountLocked = Boolean(editingId) || isCashParty;
  const totalAmount = Number(formData.totalAmount || 0);
  const paidAmount = isCashParty ? totalAmount : Number(formData.paymentAmount || 0);
  const balanceAmount = totalAmount - paidAmount;

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
        const submitButton = paidAmountInputRef.current
          ?.closest('form')
          ?.querySelector('button[type="submit"]:not([disabled])');
        submitButton?.focus();
        return;
      }
      paidAmountInputRef.current?.focus();
      paidAmountInputRef.current?.select?.();
    });
  };

  const reopenItemEntry = () => {
    setIsItemEntryClosed(false);
    setIsProductSectionActive(true);
    setProductListIndex(filteredProducts.length > 0 ? 0 : -1);
    requestAnimationFrame(() => {
      resolvedProductInputRef.current?.focus();
      resolvedProductInputRef.current?.select?.();
    });
  };

  return (
    <FormPopup
      title={editingId ? 'Edit Purchase' : 'Add Purchase'}
      subtitle="Goods bought from a supplier"
      submitLabel={loading ? 'Saving...' : editingId ? 'Update Purchase' : 'Save Purchase'}
      submitDisabled={loading}
      maxWidth="max-w-5xl"
      onSubmit={handleSubmit}
      onClose={handleCancel}
      onKeyDown={(event) => handlePopupFormKeyDown(event, handleCancel)}
    >
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      <FormSection number={1} title="Purchase Details" tone="blue">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="purchase-date-input">Purchase Date</label>
            <input id="purchase-date-input" className="input" type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} autoFocus />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="label mb-0" htmlFor="purchase-party-input">Party Name <span className="text-rose-500">*</span></label>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onOpenNewParty} className="text-xs font-semibold text-primary-600 hover:underline">+ New Party</button>
            </div>
            <div
              ref={leadgerSectionRef}
              className="relative"
              onFocusCapture={handleLeadgerFocus}
              onBlurCapture={(event) => {
                // Moving into the list itself keeps it open
                if (leadgerSectionRef.current?.contains(event.relatedTarget)) return;
                setIsLeadgerSectionActive(false);
              }}
            >
              <input
                id="purchase-party-input"
                ref={resolvedLeadgerInputRef}
                className="input pr-10"
                type="text"
                value={leadgerQuery}
                onChange={handleLeadgerInputChange}
                onKeyDown={handleLeadgerInputKeyDown}
                placeholder="Cash or search party..."
                autoComplete="off"
              />
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
                  onPick={selectLeadger}
                  footer={(
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={onOpenNewParty}
                      className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm font-semibold text-primary-600 transition hover:bg-primary-50"
                    >
                      <Plus className="h-4 w-4" />
                      Add New Party
                      <kbd className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Ctrl</kbd>
                    </button>
                  )}
                />
              )}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="purchase-invoice-input">Supplier Invoice No.</label>
            <input id="purchase-invoice-input" className="input" type="text" name="supplierInvoice" value={formData.supplierInvoice || ''} onChange={handleInputChange} onKeyDown={handleSelectEnterMoveNext} placeholder="Optional" />
          </div>

          <div>
            <p className="label">Invoice File</p>
            <input id="purchase-invoice-upload" type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={handleInvoiceUpload} disabled={uploadingInvoice} className="hidden" />
            <label
              htmlFor="purchase-invoice-upload"
              className={`flex min-h-[2.5rem] cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 text-sm font-semibold transition ${
                uploadingInvoice
                  ? 'border-slate-300 bg-white/60 text-slate-400'
                  : formData.invoiceLink
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-slate-400 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {formData.invoiceLink && !uploadingInvoice ? <FileCheck2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              {uploadingInvoice ? 'Uploading...' : formData.invoiceLink ? 'Invoice Uploaded' : 'Upload Invoice'}
            </label>
          </div>
        </div>
      </FormSection>

      <FormSection
        number={2}
        title="Items"
        tone="emerald"
        action={<span className="shrink-0 text-xs font-semibold text-slate-500">{formData.items.length} item{formData.items.length === 1 ? '' : 's'} added</span>}
      >
        <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-slate-200">
          <table className="w-full min-w-[680px] table-fixed text-left">
            <colgroup>
              <col />
              <col className="w-[7.5rem]" />
              <col className="w-[5rem]" />
              <col className="w-[9rem]" />
              <col className="w-[9rem]" />
              <col className="w-[2.75rem]" />
            </colgroup>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className={TH}>Product</th>
                <th className={`${TH} text-right`}>Qty</th>
                <th className={TH}>Unit</th>
                <th className={`${TH} text-right`}>Price</th>
                <th className={`${TH} text-right`}>Total</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {formData.items.map((item, index) => (
                <tr key={index}>
                  <td className={`${TD} truncate font-semibold text-slate-800`} title={item.productName}>{item.productName}</td>
                  <td className={`${TD} text-right`}>{item.quantity}</td>
                  <td className={`${TD} text-slate-500`}>{resolveItemUnit(item)}</td>
                  <td className={`${TD} text-right`}>{formatAmount(item.unitPrice)}</td>
                  <td className={`${TD} text-right font-semibold text-slate-900`}>{formatAmount(item.total)}</td>
                  <td className="px-1 py-1 text-center">
                    <button type="button" tabIndex={-1} title="Remove item" aria-label={`Remove ${item.productName}`} className="icon-btn p-1.5 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleRemoveItem(index)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}

              {!isItemEntryClosed && (
                <tr className="bg-emerald-50/50 align-top">
                  <td className="px-2 py-2">
                    <div
                      ref={productSectionRef}
                      className="relative"
                      onFocusCapture={handleProductFocus}
                      onBlurCapture={(event) => {
                        if (productSectionRef.current?.contains(event.relatedTarget)) return;
                        setIsProductSectionActive(false);
                      }}
                    >
                      <input
                        id="purchase-product-input"
                        ref={resolvedProductInputRef}
                        className="input pr-10"
                        type="text"
                        value={productQuery}
                        onChange={handleProductInputChange}
                        onKeyDown={(event) => handleProductInputKeyDown(event, closeItemEntryAndFocusPaidAmount)}
                        placeholder="Type to search product..."
                        autoComplete="off"
                        aria-label="Product"
                      />
                      <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isProductSectionActive ? 'rotate-180' : ''}`} />

                      {/* Row 0 of this list is "done adding items"; products start at row 1. The page's key handler counts the same way. */}
                      {isProductSectionActive && productDropdownStyle && (
                        <div className="fixed z-[80] overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-slate-200" style={productDropdownStyle} onClick={(event) => event.stopPropagation()}>
                          <div
                            className="overflow-y-auto py-1"
                            style={{ maxHeight: `calc(${typeof productDropdownStyle.maxHeight === 'number' ? `${productDropdownStyle.maxHeight}px` : productDropdownStyle.maxHeight} - 40px)` }}
                          >
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onMouseEnter={() => setProductListIndex(0)}
                              onClick={closeItemEntryAndFocusPaidAmount}
                              className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm font-semibold transition ${productListIndex === 0 ? 'bg-primary-50 text-primary-900' : 'text-slate-600'}`}
                            >
                              Done adding items
                              <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Del</kbd>
                            </button>
                            {filteredProducts.length === 0 ? (
                              <p className="px-3 py-2.5 text-sm text-slate-500">No matching product found.</p>
                            ) : filteredProducts.map((product, index) => (
                              <button
                                key={product._id}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onMouseEnter={() => setProductListIndex(index + 1)}
                                onClick={() => selectProduct(product)}
                                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${index + 1 === productListIndex ? 'bg-primary-50 text-primary-900' : 'text-slate-700'}`}
                              >
                                <span className="min-w-0 truncate font-medium">{getProductDisplayName(product)}</span>
                                {product.unit && <span className="shrink-0 text-[11px] text-slate-400">{product.unit}</span>}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={onOpenNewProduct}
                            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm font-semibold text-primary-600 transition hover:bg-primary-50"
                          >
                            <Plus className="h-4 w-4" />
                            Add New Stock Item
                            <kbd className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Ctrl</kbd>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      className="input text-right"
                      type="number"
                      placeholder="0"
                      value={currentItem.quantity}
                      onChange={(event) => setCurrentItem({ ...currentItem, quantity: event.target.value })}
                      onKeyDown={handleSelectEnterMoveNext}
                      aria-label="Quantity"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <p className="flex min-h-[2.5rem] items-center text-sm text-slate-500">{currentItemUnit}</p>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      className="input text-right"
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={currentItem.unitPrice}
                      onChange={(event) => setCurrentItem({ ...currentItem, unitPrice: event.target.value })}
                      onKeyDown={(event) => {
                        // Enter on the price adds the item and starts the next one
                        if (event.key !== 'Enter' || event.shiftKey) return;
                        event.preventDefault();
                        event.stopPropagation();
                        if (!handleAddItem()) return;
                        requestAnimationFrame(() => {
                          resolvedProductInputRef.current?.focus();
                          resolvedProductInputRef.current?.select?.();
                        });
                      }}
                      aria-label="Price"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <p className="flex min-h-[2.5rem] items-center justify-end text-sm font-semibold text-slate-900">{formatAmount(currentItemTotal)}</p>
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50">
                <td className={`${TD} text-xs text-slate-500`} colSpan={4}>
                  {isItemEntryClosed ? (
                    <button type="button" onClick={reopenItemEntry} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline">
                      <Plus size={14} /> Add another item
                    </button>
                  ) : (
                    <span>Press <kbd className="rounded bg-white px-1 py-0.5 text-[10px] font-medium ring-1 ring-slate-200">Enter</kbd> on the price to add the item</span>
                  )}
                </td>
                <td className={`${TD} text-right font-bold text-slate-900`}>{formatAmount(totalAmount)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </FormSection>

      <FormSection
        number={3}
        title="Payment"
        tone="indigo"
        hint={isCashParty
          ? 'A cash purchase is paid in full now.'
          : editingId
            ? 'The paid amount cannot be changed here. Use Money Paid for further payments.'
            : 'Enter what you paid now. The rest stays payable to the party.'}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <p className="label">Total Amount</p>
            <p className="flex min-h-[2.5rem] items-center rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-bold text-primary-700">{formatAmount(totalAmount)}</p>
          </div>
          <div>
            <label className="label" htmlFor="purchase-paid-input">Paid Amount</label>
            <div className="relative">
              <span className={PREFIX_CLASS}>₹</span>
              <input
                id="purchase-paid-input"
                ref={paidAmountInputRef}
                className="input pl-7 font-semibold"
                type="number"
                name="paymentAmount"
                value={formData.paymentAmount}
                onChange={handleInputChange}
                onKeyDown={(event) => {
                  // Backspace on an empty box goes back to adding items
                  if (event.key === 'Backspace' && !String(formData.paymentAmount || '').trim() && !isCashParty) {
                    event.preventDefault();
                    event.stopPropagation();
                    reopenItemEntry();
                  }
                }}
                step="0.01"
                min="0"
                disabled={paidAmountLocked}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="label">Paid From</label>
            <AccountSelect accounts={accounts} defaultAccountId={defaultAccountId} value={formData.account} onChange={handleInputChange} className="input" />
          </div>
        </div>

        {!editingId && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-600 ring-1 ring-inset ring-indigo-200">
            <span className="font-semibold text-slate-800">{balanceAmount <= 0 && totalAmount > 0 ? 'Cash purchase' : paidAmount > 0 ? 'Partial purchase' : 'Credit purchase'}</span>
            <span className="font-semibold">
              Balance: <span className={balanceAmount < 0 ? 'text-rose-600' : 'text-slate-900'}>{formatAmount(balanceAmount)}</span>
            </span>
          </div>
        )}
      </FormSection>
    </FormPopup>
  );
}
