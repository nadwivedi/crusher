import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Wallet } from 'lucide-react';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { useFloatingDropdownPosition } from '../../../utils/useFloatingDropdownPosition';

const TYPE_OPTIONS = [
  {
    value: 'supplier',
    label: 'Supplier',
    description: 'Use for purchase parties and payable accounts.'
  },
  {
    value: 'customer',
    label: 'Customer',
    description: 'Use for sales parties and receivable accounts.'
  }
];

const OPENING_BALANCE_OPTIONS = [
  { value: 'receivable', label: 'Receivable (Dr)' },
  { value: 'payable', label: 'Payable (Cr)' }
];

const SALE_RATE_FIELDS = [
  { name: 'tenMmRate', label: '10mm Rate' },
  { name: 'twentyMmRate', label: '20mm Rate' },
  { name: 'fortyMmRate', label: '40mm Rate' },
  { name: 'wmmRate', label: 'WMM Rate' },
  { name: 'gsbRate', label: 'GSB Rate' },
  { name: 'dustRate', label: 'Dust Rate' }
];

const FIELD_SELECTOR = [
  'input:not([type="hidden"]):not([disabled]):not([readonly])',
  'select:not([disabled]):not([readonly])',
  'textarea:not([disabled]):not([readonly])'
].join(', ');

const getInlineFieldClass = (tone = 'indigo') => {
  const focusTone = tone === 'emerald'
    ? 'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
    : 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';

  return `flex-1 min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900 transition-all placeholder:font-normal placeholder:text-gray-400 focus:outline-none ${focusTone}`;
};

const isVisibleField = (element) => {
  if (!element) return false;
  if (element.tabIndex === -1) return false;

  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
};

const getFormFields = (form) => (
  Array.from(form.querySelectorAll(FIELD_SELECTOR)).filter(isVisibleField)
);

const focusNextField = (currentElement) => {
  if (!(currentElement instanceof HTMLElement)) return;

  const form = currentElement.closest('form');
  if (!form) return;

  const fields = getFormFields(form);
  const currentIndex = fields.indexOf(currentElement);
  if (currentIndex === -1) return;

  const nextField = fields[currentIndex + 1];
  if (!(nextField instanceof HTMLElement)) return;

  nextField.focus();
  if (nextField instanceof HTMLInputElement && typeof nextField.select === 'function') {
    nextField.select();
  }
};

const getTypeLabel = (typeValue) => (
  TYPE_OPTIONS.find((option) => option.value === typeValue)?.label || ''
);

const getOpeningBalanceTypeLabel = (typeValue) => (
  OPENING_BALANCE_OPTIONS.find((option) => option.value === typeValue)?.label || ''
);

export default function AddPartyPopup({
  showForm,
  editingId,
  loading,
  formData,
  error = '',
  handleCloseForm,
  handleSubmit,
  handleChange
}) {
  const [typeQuery, setTypeQuery] = useState('');
  const [typeListIndex, setTypeListIndex] = useState(0);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [openingBalanceTypeQuery, setOpeningBalanceTypeQuery] = useState('');
  const [openingBalanceTypeListIndex, setOpeningBalanceTypeListIndex] = useState(0);
  const [isOpeningBalanceTypeDropdownOpen, setIsOpeningBalanceTypeDropdownOpen] = useState(false);
  const typeSectionRef = useRef(null);
  const typeInputRef = useRef(null);
  const openingBalanceTypeSectionRef = useRef(null);
  const openingBalanceTypeInputRef = useRef(null);
  const hasOpeningBalanceValue = String(formData.openingBalance ?? '').trim() !== '';

  const filteredTypeOptions = useMemo(() => {
    const normalized = String(typeQuery || '').trim().toLowerCase();
    const normalizedSelectedType = String(getTypeLabel(formData.type) || '').trim().toLowerCase();

    if (
      isTypeDropdownOpen
      && normalized
      && normalized === normalizedSelectedType
    ) {
      return TYPE_OPTIONS;
    }

    if (!normalized) return TYPE_OPTIONS;

    const startsWith = TYPE_OPTIONS.filter((option) => option.label.toLowerCase().startsWith(normalized));
    const includes = TYPE_OPTIONS.filter((option) => (
      !option.label.toLowerCase().startsWith(normalized)
      && option.label.toLowerCase().includes(normalized)
    ));

    return [...startsWith, ...includes];
  }, [formData.type, isTypeDropdownOpen, typeQuery]);

  const filteredOpeningBalanceTypeOptions = useMemo(() => {
    const normalized = String(openingBalanceTypeQuery || '').trim().toLowerCase();
    const normalizedSelectedType = String(getOpeningBalanceTypeLabel(formData.openingBalanceType) || '').trim().toLowerCase();

    if (
      isOpeningBalanceTypeDropdownOpen
      && normalized
      && normalized === normalizedSelectedType
    ) {
      return OPENING_BALANCE_OPTIONS;
    }

    if (!normalized) return OPENING_BALANCE_OPTIONS;

    const startsWith = OPENING_BALANCE_OPTIONS.filter((option) => option.label.toLowerCase().startsWith(normalized));
    const includes = OPENING_BALANCE_OPTIONS.filter((option) => (
      !option.label.toLowerCase().startsWith(normalized)
      && option.label.toLowerCase().includes(normalized)
    ));

    return [...startsWith, ...includes];
  }, [formData.openingBalanceType, isOpeningBalanceTypeDropdownOpen, openingBalanceTypeQuery]);

  useEffect(() => {
    if (!showForm) {
      setTypeQuery('');
      setTypeListIndex(-1);
      setIsTypeDropdownOpen(false);
      setOpeningBalanceTypeQuery('');
      setOpeningBalanceTypeListIndex(-1);
      setIsOpeningBalanceTypeDropdownOpen(false);
      return;
    }

    const nextLabel = getTypeLabel(formData.type);
    setTypeQuery(nextLabel);
    setTypeListIndex(TYPE_OPTIONS.findIndex((option) => option.value === formData.type));
    const nextOpeningBalanceTypeLabel = getOpeningBalanceTypeLabel(formData.openingBalanceType);
    setOpeningBalanceTypeQuery(nextOpeningBalanceTypeLabel);
    setOpeningBalanceTypeListIndex(OPENING_BALANCE_OPTIONS.findIndex((option) => option.value === formData.openingBalanceType));
  }, [showForm, formData.type, formData.openingBalanceType]);

  useEffect(() => {
    if (filteredTypeOptions.length === 0) {
      setTypeListIndex(-1);
      return;
    }

    setTypeListIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= filteredTypeOptions.length) return filteredTypeOptions.length - 1;
      return prev;
    });
  }, [filteredTypeOptions]);

  useEffect(() => {
    if (filteredOpeningBalanceTypeOptions.length === 0) {
      setOpeningBalanceTypeListIndex(-1);
      return;
    }

    setOpeningBalanceTypeListIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= filteredOpeningBalanceTypeOptions.length) return filteredOpeningBalanceTypeOptions.length - 1;
      return prev;
    });
  }, [filteredOpeningBalanceTypeOptions]);

  useEffect(() => {
    if (hasOpeningBalanceValue) return;
    setIsOpeningBalanceTypeDropdownOpen(false);
  }, [hasOpeningBalanceValue]);

  const typeDropdownStyle = useFloatingDropdownPosition(typeSectionRef, isTypeDropdownOpen, [filteredTypeOptions.length, typeListIndex]);
  if (!showForm) return null;

  const setTypeValue = (value) => {
    handleChange({
      target: {
        name: 'type',
        value
      }
    });
  };

  const setOpeningBalanceTypeValue = (value) => {
    handleChange({
      target: {
        name: 'openingBalanceType',
        value
      }
    });
  };

  const selectType = (option, moveNext = false) => {
    if (!option) return;

    setTypeValue(option.value);
    setTypeQuery(option.label);
    setTypeListIndex(Math.max(
      TYPE_OPTIONS.findIndex((item) => item.value === option.value),
      0
    ));
    setIsTypeDropdownOpen(false);

    if (moveNext) {
      focusNextField(typeInputRef.current);
    }
  };

  const handleTypeFocus = () => {
    setIsTypeDropdownOpen(true);
    setTypeQuery(getTypeLabel(formData.type));
    const selectedIndex = TYPE_OPTIONS.findIndex((option) => option.value === formData.type);
    setTypeListIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const handleTypeInputChange = (event) => {
    const nextValue = event.target.value;
    setTypeQuery(nextValue);
    setIsTypeDropdownOpen(true);

    const exactMatch = TYPE_OPTIONS.find(
      (option) => option.label.toLowerCase() === nextValue.trim().toLowerCase()
    );

    if (exactMatch) {
      setTypeValue(exactMatch.value);
    }
  };

  const handleTypeInputKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      setIsTypeDropdownOpen(true);
      if (filteredTypeOptions.length === 0) return;
      setTypeListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, filteredTypeOptions.length - 1);
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      setIsTypeDropdownOpen(true);
      if (filteredTypeOptions.length === 0) return;
      setTypeListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.max(prev - 1, 0);
      });
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();

      if (!isTypeDropdownOpen) {
        setIsTypeDropdownOpen(true);
        return;
      }

      const activeOption = typeListIndex >= 0 ? filteredTypeOptions[typeListIndex] : null;
      const exactMatch = TYPE_OPTIONS.find(
        (option) => option.label.toLowerCase() === typeQuery.trim().toLowerCase()
      );
      const matchedOption = activeOption || exactMatch || filteredTypeOptions[0] || null;

      if (matchedOption) {
        selectType(matchedOption, true);
      }
      return;
    }

    if (event.key === 'Escape' && isTypeDropdownOpen) {
      event.preventDefault();
      event.stopPropagation();
      setTypeQuery(getTypeLabel(formData.type));
      setIsTypeDropdownOpen(false);
    }
  };

  const selectOpeningBalanceType = (option, moveNext = false) => {
    if (!option) return;

    setOpeningBalanceTypeValue(option.value);
    setOpeningBalanceTypeQuery(option.label);
    setOpeningBalanceTypeListIndex(Math.max(
      OPENING_BALANCE_OPTIONS.findIndex((item) => item.value === option.value),
      0
    ));
    setIsOpeningBalanceTypeDropdownOpen(false);

    if (moveNext) {
      focusNextField(openingBalanceTypeInputRef.current);
    }
  };

  const handleOpeningBalanceTypeFocus = () => {
    setIsOpeningBalanceTypeDropdownOpen(true);
    setOpeningBalanceTypeQuery(getOpeningBalanceTypeLabel(formData.openingBalanceType));
    const selectedIndex = OPENING_BALANCE_OPTIONS.findIndex((option) => option.value === formData.openingBalanceType);
    setOpeningBalanceTypeListIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const handleOpeningBalanceTypeInputChange = (event) => {
    const nextValue = event.target.value;
    setOpeningBalanceTypeQuery(nextValue);
    setIsOpeningBalanceTypeDropdownOpen(true);

    const exactMatch = OPENING_BALANCE_OPTIONS.find(
      (option) => option.label.toLowerCase() === nextValue.trim().toLowerCase()
    );

    if (exactMatch) {
      setOpeningBalanceTypeValue(exactMatch.value);
    }
  };

  const handleOpeningBalanceTypeInputKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      setIsOpeningBalanceTypeDropdownOpen(true);
      if (filteredOpeningBalanceTypeOptions.length === 0) return;
      setOpeningBalanceTypeListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, filteredOpeningBalanceTypeOptions.length - 1);
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      setIsOpeningBalanceTypeDropdownOpen(true);
      if (filteredOpeningBalanceTypeOptions.length === 0) return;
      setOpeningBalanceTypeListIndex((prev) => {
        if (prev < 0) return 0;
        return Math.max(prev - 1, 0);
      });
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();

      if (!isOpeningBalanceTypeDropdownOpen) {
        setIsOpeningBalanceTypeDropdownOpen(true);
        return;
      }

      const activeOption = openingBalanceTypeListIndex >= 0 ? filteredOpeningBalanceTypeOptions[openingBalanceTypeListIndex] : null;
      const exactMatch = OPENING_BALANCE_OPTIONS.find(
        (option) => option.label.toLowerCase() === openingBalanceTypeQuery.trim().toLowerCase()
      );
      const matchedOption = activeOption || exactMatch || filteredOpeningBalanceTypeOptions[0] || null;

      if (matchedOption) {
        selectOpeningBalanceType(matchedOption, true);
      }
      return;
    }

    if (event.key === 'Escape' && isOpeningBalanceTypeDropdownOpen) {
      event.preventDefault();
      event.stopPropagation();
      setOpeningBalanceTypeQuery(getOpeningBalanceTypeLabel(formData.openingBalanceType));
      setIsOpeningBalanceTypeDropdownOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-[1.5px] md:p-4" onClick={handleCloseForm}>
      <div
        className="flex max-h-[92vh] w-full max-w-[42rem] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200/80 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 border-b border-white/15 bg-gradient-to-r from-cyan-700 via-blue-700 to-indigo-700 px-3 py-1.5 text-white md:px-4 md:py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20 text-white ring-1 ring-white/30 md:h-8 md:w-8">
                <Wallet className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold md:text-xl">{editingId ? 'Edit Party' : 'Add New Party'}</h2>
                <p className="mt-0.5 text-[11px] text-cyan-100 md:text-xs">Create or update party details in a simple format.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCloseForm}
              className="text-white hover:bg-white/25 rounded-lg p-1.5 md:p-2 transition"
              aria-label="Close popup"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form
          id="party-form"
          onSubmit={handleSubmit}
          onKeyDown={(e) => handlePopupFormKeyDown(e, handleCloseForm)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-2.5 md:p-4">
            <div className="flex flex-col gap-3 md:gap-4">
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-2.5 md:p-4">
                <h3 className="text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2">
                  <span className="bg-indigo-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm">1</span>
                  Party Details
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(200px,0.72fr)] md:gap-x-2 md:gap-y-4">
                  <div className="min-w-0">
                    <label htmlFor="party-name-input" className="mb-1.5 block text-xs font-semibold text-gray-700 sm:text-sm">
                      Party Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="party-name-input"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={getInlineFieldClass('indigo')}
                      placeholder="Enter party name"
                      autoFocus
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <label htmlFor="party-type-input" className="mb-1.5 block text-xs font-semibold text-gray-700 sm:text-sm">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <div
                      ref={typeSectionRef}
                      className="relative min-w-0 w-full"
                      onBlurCapture={(event) => {
                        const nextFocused = event.relatedTarget;
                        if (
                          typeSectionRef.current
                          && nextFocused instanceof Node
                          && typeSectionRef.current.contains(nextFocused)
                        ) {
                          return;
                        }

                        setTypeQuery(getTypeLabel(formData.type));
                        setIsTypeDropdownOpen(false);
                      }}
                    >
                      <div className="relative">
                        <input
                          id="party-type-input"
                          ref={typeInputRef}
                          type="text"
                          value={typeQuery}
                          onChange={handleTypeInputChange}
                          onFocus={handleTypeFocus}
                          onKeyDown={handleTypeInputKeyDown}
                          className={`${getInlineFieldClass('indigo')} pr-10`}
                          placeholder="Choose party type"
                          autoComplete="off"
                          required
                        />
                        <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500 transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>

                      {isTypeDropdownOpen && typeDropdownStyle && (
                        <div
                          className="fixed z-[80] overflow-hidden rounded-xl border border-amber-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                          style={typeDropdownStyle}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="flex items-center justify-between border-b border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-2">
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Type List</span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm">
                              {(filteredTypeOptions.length > 0 ? filteredTypeOptions : TYPE_OPTIONS).length}
                            </span>
                          </div>
                          <div className="overflow-y-auto py-1" style={{ maxHeight: typeDropdownStyle.maxHeight }}>
                            {(filteredTypeOptions.length > 0 ? filteredTypeOptions : TYPE_OPTIONS).length === 0 ? (
                              <div className="px-3 py-3 text-center text-[13px] text-slate-500">
                                No matching types found.
                              </div>
                            ) : (
                              (filteredTypeOptions.length > 0 ? filteredTypeOptions : TYPE_OPTIONS).map((option, index) => {
                                const isActive = index === typeListIndex;
                                const isSelected = String(formData.type || '') === String(option.value);

                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onMouseEnter={() => setTypeListIndex(index)}
                                    onClick={() => selectType(option, true)}
                                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition ${
                                      isActive
                                        ? 'bg-yellow-200 text-amber-950'
                                        : isSelected
                                        ? 'bg-yellow-50 text-amber-800'
                                        : 'text-slate-700 hover:bg-amber-50'
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate font-medium">{option.label}</p>
                                      <p className={`mt-0.5 text-[11px] ${isActive ? 'text-amber-900' : isSelected ? 'text-amber-700' : 'text-slate-500'}`}>
                                        {option.description}
                                      </p>
                                    </div>
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
                </div>
              </div>

              <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-green-50 to-emerald-50 p-2.5 md:p-4">
                <h3 className="text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2">
                  <span className="bg-emerald-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm">2</span>
                  Contact Details
                </h3>

                <div className="flex flex-col gap-3 md:gap-4">
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                    <label htmlFor="party-mobile-input" className="shrink-0 text-xs font-semibold text-gray-700 sm:w-32 sm:text-sm">
                      Mobile Number
                    </label>
                    <input
                      id="party-mobile-input"
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      className={getInlineFieldClass('emerald')}
                      placeholder="10-digit mobile number"
                    />
                  </div>

                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                    <label htmlFor="party-opening-balance-input" className="shrink-0 text-xs font-semibold text-gray-700 sm:w-32 sm:text-sm">
                      Opening Balance
                    </label>
                    <div className="flex min-w-0 flex-1 flex-row gap-2">
                      <div className="min-w-0 basis-[46%]">
                        <input
                          id="party-opening-balance-input"
                          type="number"
                          name="openingBalance"
                          value={formData.openingBalance ?? ''}
                          onChange={handleChange}
                          min="0"
                          step="0.01"
                          className={getInlineFieldClass('emerald')}
                          placeholder="0.00"
                        />
                      </div>
                      <div
                        ref={openingBalanceTypeSectionRef}
                        className="relative min-w-0 basis-[54%]"
                        onBlurCapture={(event) => {
                          const nextFocused = event.relatedTarget;
                          if (
                            openingBalanceTypeSectionRef.current
                            && nextFocused instanceof Node
                            && openingBalanceTypeSectionRef.current.contains(nextFocused)
                          ) {
                            return;
                          }

                          setOpeningBalanceTypeQuery(getOpeningBalanceTypeLabel(formData.openingBalanceType));
                          setIsOpeningBalanceTypeDropdownOpen(false);
                        }}
                      >
                        <div className="relative">
                          <input
                            ref={openingBalanceTypeInputRef}
                            type="text"
                            value={openingBalanceTypeQuery}
                            onChange={handleOpeningBalanceTypeInputChange}
                            onFocus={(event) => {
                              if (!hasOpeningBalanceValue) {
                                event.target.blur();
                                return;
                              }
                              handleOpeningBalanceTypeFocus();
                            }}
                            onKeyDown={handleOpeningBalanceTypeInputKeyDown}
                            className={`${getInlineFieldClass('emerald')} pr-10 text-xs ${!hasOpeningBalanceValue ? 'cursor-not-allowed bg-gray-100 text-gray-400' : ''}`}
                            placeholder="Choose balance type"
                            autoComplete="off"
                            disabled={!hasOpeningBalanceValue}
                          />
                          <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-transform ${!hasOpeningBalanceValue ? 'text-gray-400' : 'text-emerald-500'} ${isOpeningBalanceTypeDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {hasOpeningBalanceValue && isOpeningBalanceTypeDropdownOpen && (
                          <div
                            className="absolute left-0 right-0 top-[calc(100%+6px)] z-[80] overflow-hidden rounded-xl border border-amber-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="flex items-center justify-between border-b border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-2">
                              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Balance Type</span>
                              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm">
                                {(filteredOpeningBalanceTypeOptions.length > 0 ? filteredOpeningBalanceTypeOptions : OPENING_BALANCE_OPTIONS).length}
                              </span>
                            </div>
                            <div className="max-h-64 overflow-y-auto py-1">
                              {(filteredOpeningBalanceTypeOptions.length > 0 ? filteredOpeningBalanceTypeOptions : OPENING_BALANCE_OPTIONS).map((option, index) => {
                                const isActive = index === openingBalanceTypeListIndex;
                                const isSelected = String(formData.openingBalanceType || '') === String(option.value);

                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onMouseEnter={() => setOpeningBalanceTypeListIndex(index)}
                                    onClick={() => selectOpeningBalanceType(option, true)}
                                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition ${
                                      isActive
                                        ? 'bg-yellow-200 text-amber-950'
                                        : isSelected
                                        ? 'bg-yellow-50 text-amber-800'
                                        : 'text-slate-700 hover:bg-amber-50'
                                    }`}
                                  >
                                    <span className="truncate font-medium">{option.label}</span>
                                    {isSelected && (
                                      <span className="shrink-0 rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                        Selected
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-2.5 md:p-4">
                <h3 className="text-base md:text-lg font-bold text-gray-800 mb-3 md:mb-4 flex items-center gap-2">
                  <span className="bg-amber-600 text-white w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm">3</span>
                  Sale Rate Per Ton
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {SALE_RATE_FIELDS.map((field) => (
                    <div key={field.name} className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                      <label htmlFor={field.name} className="shrink-0 text-xs font-semibold text-gray-700 sm:w-28 sm:text-sm">
                        {field.label}
                      </label>
                      <input
                        id={field.name}
                        type="number"
                        name={field.name}
                        value={formData[field.name] ?? ''}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        className={getInlineFieldClass('emerald')}
                        placeholder="0.00"
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs font-medium text-amber-700">
                  Set party-wise selling rate in Rs per ton for each material.
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-3 py-2 md:flex-row md:px-4">
            <div className="text-[11px] text-gray-600 md:text-xs">
              <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Esc</kbd> to close
            </div>

            <div className="flex w-full gap-2 md:w-auto">
              <button
                type="button"
                onClick={handleCloseForm}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 md:flex-none md:px-5"
              >
                Cancel
              </button>

              <button
                type="submit"
                form="party-form"
                disabled={loading}
                className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-1.5 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 md:flex-none md:px-6"
              >
                {loading ? 'Saving...' : editingId ? 'Update Party' : 'Save Party'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
