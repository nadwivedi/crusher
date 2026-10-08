import { ChevronDown } from 'lucide-react';
import FormPopup from '../../../components/FormPopup';
import FormSection from '../../../components/FormSection';
import OptionList from '../../../components/OptionList';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { useFloatingDropdownPosition } from '../../../utils/useFloatingDropdownPosition';

export default function AddReceiptPopup({
  showForm,
  loading,
  error = '',
  formData,
  partySectionRef,
  receiptAccountSectionRef,
  partyQuery,
  receiptAccountQuery,
  partyListIndex,
  receiptAccountListIndex,
  filteredParties,
  filteredReceiptAccounts,
  isPartySectionActive,
  isReceiptAccountSectionActive,
  setPartyListIndex,
  setReceiptAccountListIndex,
  setIsPartySectionActive,
  setIsReceiptAccountSectionActive,
  getPartyDisplayName,
  handleCloseForm,
  handleSubmit,
  handleChange,
  handleReceiptDateBlur,
  handlePartyFocus,
  handleReceiptAccountFocus,
  handlePartyInputChange,
  handleReceiptAccountInputChange,
  handlePartyInputKeyDown,
  handleReceiptAccountInputKeyDown,
  selectParty,
  selectReceiptAccount
}) {
  const partyDropdownStyle = useFloatingDropdownPosition(partySectionRef, isPartySectionActive, [filteredParties.length, partyListIndex]);
  const receiptAccountDropdownStyle = useFloatingDropdownPosition(receiptAccountSectionRef, isReceiptAccountSectionActive, [filteredReceiptAccounts.length, receiptAccountListIndex]);

  if (!showForm) return null;

  return (
    <FormPopup
      title="New Receipt"
      subtitle="Money received from a party"
      submitLabel={loading ? 'Saving...' : 'Save Receipt'}
      submitDisabled={loading}
      maxWidth="max-w-xl"
      onSubmit={handleSubmit}
      onClose={handleCloseForm}
      onKeyDown={(event) => handlePopupFormKeyDown(event, handleCloseForm)}
    >
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      <FormSection number={1} title="Receipt Details" tone="blue">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="receipt-date-input">Date</label>
            <input
              id="receipt-date-input"
              className="input"
              type="text"
              name="receiptDate"
              value={formData.receiptDate}
              onChange={handleChange}
              onBlur={handleReceiptDateBlur}
              placeholder="DD/MM/YYYY"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="receipt-amount-input">Amount <span className="text-rose-500">*</span></label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400">₹</span>
              <input
                id="receipt-amount-input"
                className="input pl-7 font-semibold text-emerald-700"
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                placeholder="0"
                required
              />
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection number={2} title="Party & Account" tone="emerald">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="receipt-party-input">Received From <span className="text-rose-500">*</span></label>
            <div
              ref={partySectionRef}
              className="relative"
              onFocusCapture={handlePartyFocus}
              onBlurCapture={(event) => {
                // Moving into the list itself keeps it open
                if (partySectionRef.current?.contains(event.relatedTarget)) return;
                setIsPartySectionActive(false);
              }}
            >
              <input
                id="receipt-party-input"
                className="input pr-10"
                type="text"
                value={partyQuery}
                onChange={handlePartyInputChange}
                onKeyDown={handlePartyInputKeyDown}
                placeholder="Type to search party"
                autoComplete="off"
              />
              <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isPartySectionActive ? 'rotate-180' : ''}`} />

              {isPartySectionActive && partyDropdownStyle && (
                <OptionList
                  style={partyDropdownStyle}
                  options={filteredParties}
                  activeIndex={partyListIndex}
                  emptyText="No matching party found."
                  getKey={(party) => party._id}
                  getLabel={getPartyDisplayName}
                  isSelected={(party) => String(formData.party || '') === String(party._id)}
                  onHover={setPartyListIndex}
                  onPick={(party) => {
                    selectParty(party);
                    setIsPartySectionActive(false);
                  }}
                />
              )}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="receipt-account-input">Received In</label>
            <div
              ref={receiptAccountSectionRef}
              className="relative"
              onFocusCapture={handleReceiptAccountFocus}
              onBlurCapture={(event) => {
                if (receiptAccountSectionRef.current?.contains(event.relatedTarget)) return;
                setIsReceiptAccountSectionActive(false);
              }}
            >
              <input
                id="receipt-account-input"
                className="input pr-10"
                type="text"
                value={receiptAccountQuery}
                onChange={handleReceiptAccountInputChange}
                onKeyDown={handleReceiptAccountInputKeyDown}
                placeholder="Cash or bank account"
                autoComplete="off"
              />
              <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isReceiptAccountSectionActive ? 'rotate-180' : ''}`} />

              {isReceiptAccountSectionActive && receiptAccountDropdownStyle && (
                <OptionList
                  style={receiptAccountDropdownStyle}
                  options={filteredReceiptAccounts}
                  activeIndex={receiptAccountListIndex}
                  emptyText="No matching account found."
                  getKey={(accountName) => accountName}
                  getLabel={(accountName) => accountName}
                  isSelected={(accountName) => formData.method === accountName}
                  onHover={setReceiptAccountListIndex}
                  onPick={(accountName) => {
                    selectReceiptAccount(accountName);
                    setIsReceiptAccountSectionActive(false);
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="receipt-notes-input">Notes</label>
          <input
            id="receipt-notes-input"
            className="input"
            type="text"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            onKeyDown={(event) => {
              // Last field: Enter saves
              if (event.key !== 'Enter' || event.shiftKey) return;
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }}
            placeholder="Optional"
          />
        </div>
      </FormSection>
    </FormPopup>
  );
}
