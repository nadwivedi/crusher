import { Building2, CalendarDays, Wallet, X, MessageSquare, IndianRupee } from 'lucide-react';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { useFloatingDropdownPosition } from '../../../utils/useFloatingDropdownPosition';

export default function AddPaymentPopup({
  showForm,
  loading,
  formData,
  parties,
  paymentAccountOptions,
  paymentAccountSectionRef,
  partySectionRef,
  paymentAccountQuery,
  partyQuery,
  paymentAccountListIndex,
  partyListIndex,
  filteredPaymentAccounts,
  filteredParties,
  isPaymentAccountSectionActive,
  isPartySectionActive,
  purchaseOptions,
  purchasePaymentMap,
  setFormData,
  setPaymentAccountListIndex,
  setPartyListIndex,
  setIsPaymentAccountSectionActive,
  setIsPartySectionActive,
  getPartyDisplayName,
  handleCloseForm,
  handleSubmit,
  handleChange,
  handlePaymentDateBlur,
  handlePaymentAccountFocus,
  handlePartyFocus,
  handlePaymentAccountInputChange,
  handlePartyInputChange,
  handlePaymentAccountInputKeyDown,
  handlePartyInputKeyDown,
  selectPaymentAccount,
  selectParty
}) {
  const inputClass = 'w-full rounded-lg border border-slate-400 bg-white px-2.5 py-1.5 text-[13px] text-gray-800 transition placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2';
  const labelClass = 'mb-1 block text-[11px] font-semibold text-gray-700 md:text-xs';
  const partyDropdownStyle = useFloatingDropdownPosition(partySectionRef, isPartySectionActive, [filteredParties.length, partyListIndex]);
  const paymentAccountDropdownStyle = useFloatingDropdownPosition(paymentAccountSectionRef, isPaymentAccountSectionActive, [filteredPaymentAccounts.length, paymentAccountListIndex]);

  if (!showForm) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[2px] md:items-center md:p-6" onClick={handleCloseForm}>
      <div className="relative flex h-[100dvh] max-h-[100dvh] w-full max-w-[30rem] md:max-w-[48rem] flex-col overflow-hidden rounded-none border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)] md:h-auto md:max-h-[90vh] md:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-[linear-gradient(135deg,#0e7490_0%,#1d4ed8_55%,#4338ca_100%)] px-4 py-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold md:text-xl">New Payment Entry</h2>
              <p className="text-[11px] text-white/80 md:text-xs">Record money paid to a party or supplier</p>
            </div>
            <button type="button" onClick={handleCloseForm} className="rounded-lg p-1.5 text-white transition hover:bg-white/20">
              <X className="h-5 w-5 md:h-6 md:w-6" />
            </button>
          </div>
        </div>

        <form id="payment-form" onSubmit={handleSubmit} onKeyDown={(e) => handlePopupFormKeyDown(e, handleCloseForm)} className="flex flex-1 flex-col overflow-hidden bg-slate-50">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            
            {/* Main Details Section */}
            <div className="rounded-2xl border border-blue-200 bg-white p-3 shadow-sm transition hover:shadow-md">
              <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-blue-900">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">1</span>
                Transaction Details
              </h3>
              
              <div className="space-y-4">
                {/* Row 1: Date, Amount, Party */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className={labelClass}>Payment Date</label>
                    <div className="relative">
                      <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <input type="text" name="paymentDate" value={formData.paymentDate} onChange={handleChange} onBlur={handlePaymentDateBlur} className={`${inputClass} pl-9 focus:ring-blue-500`} placeholder="DD/MM/YYYY" inputMode="numeric" autoFocus />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={labelClass}>Amount Paid (Rs)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <input type="number" name="amount" value={formData.amount} onChange={handleChange} step="0.01" className={`${inputClass} pl-9 font-bold text-emerald-700 focus:ring-blue-500`} placeholder="0.00" required />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={labelClass}>Party Name</label>
                    <div ref={partySectionRef} className="relative" onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsPartySectionActive(false); }}>
                      <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <input type="text" value={partyQuery} onFocus={handlePartyFocus} onChange={handlePartyInputChange} onKeyDown={handlePartyInputKeyDown} className={`${inputClass} pl-9 focus:ring-blue-500`} placeholder="Search party..." autoComplete="off" />
                      {isPartySectionActive && partyDropdownStyle && (
                        <div className="fixed z-[80] overflow-hidden rounded-xl border border-blue-200 bg-white shadow-xl" style={partyDropdownStyle}>
                          <div className="bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700 uppercase">Parties ({filteredParties.length})</div>
                          <div className="overflow-y-auto py-1" style={{ maxHeight: partyDropdownStyle.maxHeight }}>
                            {filteredParties.length === 0 ? <div className="px-3 py-2 text-xs text-slate-500">No parties found</div> : filteredParties.map((p, i) => (
                              <button key={p._id} type="button" onMouseDown={e => e.preventDefault()} onMouseEnter={() => setPartyListIndex(i)} onClick={() => { selectParty(p); setIsPartySectionActive(false); }} className={`w-full px-3 py-2 text-left text-xs ${i === partyListIndex ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-50'}`}>{getPartyDisplayName(p)}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 2: Account & Notes */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className={labelClass}>Payment Account</label>
                    <div ref={paymentAccountSectionRef} className="relative" onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsPaymentAccountSectionActive(false); }}>
                      <Wallet className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <input type="text" value={paymentAccountQuery} onFocus={handlePaymentAccountFocus} onChange={handlePaymentAccountInputChange} onKeyDown={handlePaymentAccountInputKeyDown} className={`${inputClass} pl-9 focus:ring-blue-500`} placeholder="Search account..." autoComplete="off" />
                      {isPaymentAccountSectionActive && paymentAccountDropdownStyle && (
                        <div className="fixed z-[80] overflow-hidden rounded-xl border border-blue-200 bg-white shadow-xl" style={paymentAccountDropdownStyle}>
                          <div className="bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-blue-700 uppercase">Accounts ({filteredPaymentAccounts.length})</div>
                          <div className="overflow-y-auto py-1" style={{ maxHeight: paymentAccountDropdownStyle.maxHeight }}>
                            {filteredPaymentAccounts.length === 0 ? <div className="px-3 py-2 text-xs text-slate-500">No accounts found</div> : filteredPaymentAccounts.map((acc, i) => (
                              <button key={acc} type="button" onMouseDown={e => e.preventDefault()} onMouseEnter={() => setPaymentAccountListIndex(i)} onClick={() => { selectPaymentAccount(acc); setIsPaymentAccountSectionActive(false); }} className={`w-full px-3 py-2 text-left text-xs ${i === paymentAccountListIndex ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:bg-slate-50'}`}>{acc}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={labelClass}>Notes / Remarks</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <textarea name="notes" value={formData.notes} onChange={handleChange} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} rows="2" className={`${inputClass} pl-9 resize-none focus:ring-blue-500`} placeholder="Optional notes about this payment..." />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
            <div className="hidden md:block text-[10px] text-slate-400">Press <kbd className="rounded bg-slate-100 px-1 py-0.5 border">Esc</kbd> to cancel</div>
            <div className="flex gap-2 w-full md:w-auto">
              <button type="button" onClick={handleCloseForm} className="flex-1 md:flex-none px-6 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 md:flex-none px-8 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 text-sm font-bold text-white shadow-lg hover:shadow-cyan-500/30 transition disabled:opacity-50">
                {loading ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
