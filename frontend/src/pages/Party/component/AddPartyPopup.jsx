import { useState } from 'react';
import { ChevronDown, Store, Truck, User } from 'lucide-react';
import FormPopup from '../../../components/FormPopup';
import FormSection from '../../../components/FormSection';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';

const TYPE_OPTIONS = [
  { value: 'customer', label: 'Customer', hint: 'Buys material from you', Icon: User },
  { value: 'supplier', label: 'Supplier', hint: 'You buy from them', Icon: Store },
  { value: 'transporter', label: 'Transporter', hint: 'Vehicles on hire', Icon: Truck }
];

const OPENING_BALANCE_OPTIONS = [
  { value: 'receivable', label: 'Receivable', hint: 'The party has to pay you this amount.', activeClass: 'border-emerald-600 bg-emerald-600 text-white' },
  { value: 'payable', label: 'Payable', hint: 'You have to pay the party this amount.', activeClass: 'border-rose-600 bg-rose-600 text-white' }
];

const SALE_RATE_FIELDS = [
  { name: 'tenMmRate', label: '10mm' },
  { name: 'twentyMmRate', label: '20mm' },
  { name: 'fortyMmRate', label: '40mm' },
  { name: 'wmmRate', label: 'WMM' },
  { name: 'gsbRate', label: 'GSB' },
  { name: 'dustRate', label: 'Dust' }
];

const INACTIVE_OPTION_CLASS = 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100';

/** Rate box with the unit shown inside it. */
function RateInput({ name, label, value, onChange }) {
  return (
    <div>
      <label className="label" htmlFor={`party-${name}`}>{label}</label>
      <div className="relative">
        <input
          id={`party-${name}`}
          className="input pr-14"
          type="number"
          name={name}
          value={value ?? ''}
          onChange={onChange}
          min="0"
          step="0.01"
          placeholder="0"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">₹/ton</span>
      </div>
    </div>
  );
}

function PartyForm({ editingId, loading, formData, error, handleCloseForm, handleSubmit, handleChange }) {
  // null until the user opens or closes the rates section themselves
  const [ratesToggled, setRatesToggled] = useState(null);
  const isCashParty = formData.type === 'cash-in-hand';
  const hasOpeningBalance = String(formData.openingBalance ?? '').trim() !== '';
  const openingBalanceOption = OPENING_BALANCE_OPTIONS.find((option) => option.value === formData.openingBalanceType);
  const filledRateCount = SALE_RATE_FIELDS.filter((field) => Number(formData[field.name] || 0) > 0).length;
  // Customers are the ones who buy, so their rates start open; for others they stay out of the way
  const ratesOpen = ratesToggled ?? (formData.type === 'customer' || filledRateCount > 0);

  const setField = (name, value) => handleChange({ target: { name, value } });

  // Sections are numbered in the order they show for this party type
  let sectionNumber = 0;

  return (
    <FormPopup
      title={editingId ? 'Edit Party' : 'Add Party'}
      subtitle="A customer, supplier or transporter you deal with"
      submitLabel={loading ? 'Saving...' : editingId ? 'Update Party' : 'Save Party'}
      submitDisabled={loading}
      maxWidth="max-w-xl"
      onSubmit={handleSubmit}
      onClose={handleCloseForm}
      onKeyDown={(event) => handlePopupFormKeyDown(event, handleCloseForm)}
    >
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      <FormSection number={++sectionNumber} title="Party Details" tone="blue">
        {isCashParty ? (
          <p className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
            This is a cash party. Cash sales, purchases and expenses are kept under it.
          </p>
        ) : (
          <div>
            <label className="label">Party Type <span className="text-rose-500">*</span></label>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((option) => {
                const active = formData.type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setField('type', option.value)}
                    aria-pressed={active}
                    className={`rounded-lg border px-1 py-2 transition sm:px-3 sm:text-left ${active ? 'border-primary-600 bg-primary-600 text-white' : INACTIVE_OPTION_CLASS}`}
                  >
                    {/* Phones: icon above the name so "Transporter" fits. Wider screens: icon beside it. */}
                    <span className="flex flex-col items-center gap-1 text-xs font-semibold sm:flex-row sm:gap-1.5 sm:text-sm">
                      <option.Icon size={16} className="shrink-0" />
                      <span>{option.label}</span>
                    </span>
                    <span className={`mt-0.5 hidden text-[11px] sm:block ${active ? 'text-primary-100' : 'text-slate-400'}`}>{option.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <div className="sm:col-span-3">
            <label className="label" htmlFor="party-name-input">Party Name <span className="text-rose-500">*</span></label>
            <input
              id="party-name-input"
              className="input"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Sharma Construction"
              autoComplete="off"
              autoFocus
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="party-mobile-input">Mobile Number</label>
            <input
              id="party-mobile-input"
              className="input"
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              placeholder="10 digits"
              autoComplete="off"
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        number={++sectionNumber}
        title="Opening Balance"
        tone="sky"
        hint={hasOpeningBalance && openingBalanceOption
          ? openingBalanceOption.hint
          : 'Old balance with this party before you started entries here. Leave blank if there is none.'}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5 sm:gap-3">
          <div className="relative sm:col-span-2">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400">₹</span>
            <input
              id="party-opening-balance-input"
              className="input pl-7"
              type="number"
              name="openingBalance"
              value={formData.openingBalance ?? ''}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="0"
              aria-label="Opening balance"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:col-span-3">
            {OPENING_BALANCE_OPTIONS.map((option) => {
              const active = hasOpeningBalance && formData.openingBalanceType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setField('openingBalanceType', option.value)}
                  aria-pressed={active}
                  disabled={!hasOpeningBalance}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:border-slate-200 disabled:bg-white/60 disabled:text-slate-400 ${active ? option.activeClass : INACTIVE_OPTION_CLASS}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </FormSection>

      {formData.type === 'supplier' && (
        <FormSection number={++sectionNumber} title="Boulder Rate" tone="indigo" hint="Filled in for you on every boulder entry from this supplier.">
          <div className="grid grid-cols-1 sm:grid-cols-5">
            <div className="sm:col-span-2">
              <RateInput name="boulderRatePerTon" label="Rate per ton" value={formData.boulderRatePerTon} onChange={handleChange} />
            </div>
          </div>
        </FormSection>
      )}

      {!isCashParty && (
        <FormSection
          number={++sectionNumber}
          title="Special Sale Rates"
          tone="emerald"
          hint="Only if this party gets its own price. Blank uses your normal rate."
          action={(
            <button
              type="button"
              onClick={() => setRatesToggled(!ratesOpen)}
              aria-expanded={ratesOpen}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-white/70"
            >
              {!ratesOpen && filledRateCount > 0 && <span className="badge-blue">{filledRateCount} set</span>}
              {ratesOpen ? 'Hide' : 'Show'}
              <ChevronDown size={16} className={`transition-transform ${ratesOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        >
          {ratesOpen && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SALE_RATE_FIELDS.map((field) => (
                <RateInput key={field.name} name={field.name} label={field.label} value={formData[field.name]} onChange={handleChange} />
              ))}
            </div>
          )}
        </FormSection>
      )}
    </FormPopup>
  );
}

/** Add or edit a party. Opened from the party master and from the sale, purchase and vehicle forms. */
export default function AddPartyPopup({ showForm, error = '', ...props }) {
  // Mounted only while open, so the form starts fresh each time
  if (!showForm) return null;
  return <PartyForm error={error} {...props} />;
}
