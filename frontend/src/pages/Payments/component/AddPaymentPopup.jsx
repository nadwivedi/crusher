import { ChevronDown } from 'lucide-react';
import FormPopup from '../../../components/FormPopup';
import FormSection from '../../../components/FormSection';
import OptionList from '../../../components/OptionList';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { useFloatingDropdownPosition } from '../../../utils/useFloatingDropdownPosition';

export default function AddPaymentPopup({
  showForm,
  loading,
  error = '',
  formData,
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
  const partyDropdownStyle = useFloatingDropdownPosition(partySectionRef, isPartySectionActive, [filteredParties.length, partyListIndex]);
  const paymentAccountDropdownStyle = useFloatingDropdownPosition(paymentAccountSectionRef, isPaymentAccountSectionActive, [filteredPaymentAccounts.length, paymentAccountListIndex]);

  if (!showForm) return null;

  return (
    <FormPopup
      title="New Payment"
      subtitle="Money paid to a party"
      submitLabel={loading ? 'Saving...' : 'Save Payment'}
      submitDisabled={loading}
      maxWidth="max-w-xl"
      onSubmit={handleSubmit}
      onClose={handleCloseForm}
      onKeyDown={(event) => handlePopupFormKeyDown(event, handleCloseForm)}
    >
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      <FormSection number={1} title="Payment Details" tone="blue">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="payment-date-input">Date</label>
            <input
              id="payment-date-input"
              className="input"
              type="text"
              name="paymentDate"
              value={formData.paymentDate}
              onChange={handleChange}
              onBlur={handlePaymentDateBlur}
              placeholder="DD/MM/YYYY"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="payment-amount-input">Amount <span className="text-rose-500">*</span></label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400">₹</span>
              <input
                id="payment-amount-input"
                className="input pl-7 font-semibold text-rose-700"
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
            <label className="label" htmlFor="payment-party-input">Paid To</label>
            <div
              ref={partySectionRef}
              className="relative"
              onBlurCapture={(event) => {
                // Moving into the list itself keeps it open
                if (partySectionRef.current?.contains(event.relatedTarget)) return;
                setIsPartySectionActive(false);
              }}
            >
              <input
                id="payment-party-input"
                className="input pr-10"
                type="text"
                value={partyQuery}
                onFocus={handlePartyFocus}
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
            <label className="label" htmlFor="payment-account-input">Paid From</label>
            <div
              ref={paymentAccountSectionRef}
              className="relative"
              onBlurCapture={(event) => {
                if (paymentAccountSectionRef.current?.contains(event.relatedTarget)) return;
                setIsPaymentAccountSectionActive(false);
              }}
            >
              <input
                id="payment-account-input"
                className="input pr-10"
                type="text"
                value={paymentAccountQuery}
                onFocus={handlePaymentAccountFocus}
                onChange={handlePaymentAccountInputChange}
                onKeyDown={handlePaymentAccountInputKeyDown}
                placeholder="Cash or bank account"
                autoComplete="off"
              />
              <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isPaymentAccountSectionActive ? 'rotate-180' : ''}`} />

              {isPaymentAccountSectionActive && paymentAccountDropdownStyle && (
                <OptionList
                  style={paymentAccountDropdownStyle}
                  options={filteredPaymentAccounts}
                  activeIndex={paymentAccountListIndex}
                  emptyText="No matching account found."
                  getKey={(accountName) => accountName}
                  getLabel={(accountName) => accountName}
                  isSelected={(accountName) => formData.method === accountName}
                  onHover={setPaymentAccountListIndex}
                  onPick={(accountName) => {
                    selectPaymentAccount(accountName);
                    setIsPaymentAccountSectionActive(false);
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="payment-notes-input">Notes</label>
          <input
            id="payment-notes-input"
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
