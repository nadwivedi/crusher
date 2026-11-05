import { useMemo, useRef, useState } from 'react';
import { CalendarCheck, Camera, ChevronDown, FileText, Paperclip, Search, Truck, UploadCloud, X } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../../utils/api';
import FormPopup from '../../../components/FormPopup';
import FormSection from '../../../components/FormSection';
import OptionList from '../../../components/OptionList';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { useFloatingDropdownPosition } from '../../../utils/useFloatingDropdownPosition';
import { formatDayInput, toDayInput } from '../../../utils/monthlyHire';
import { DOCUMENT_TYPES, describeDaysLeft, getExpiryStatus, isImageFile } from '../../../utils/vehicleDocuments';
import { getVehicleCategoryLabel } from '../../../utils/transport';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// Quick lengths for Valid To; a new document starts on 1 year
const PERIODS = [
  { months: 6, label: '6 Months' },
  { months: 12, label: '1 Year' },
  { months: 24, label: '2 Years' },
  { months: 60, label: '5 Years' }
];
const DEFAULT_MONTHS = 12;

const pad = (value) => String(value).padStart(2, '0');

/**
 * Last valid day of a paper that starts on `from` and runs `months`: one day before the same date that many
 * months later, the way policies are written (from 05 Nov 2026 for a year → valid to 04 Nov 2027).
 * When that date does not exist (31 Aug + 6 months, 29 Feb + 1 year) it ends on the last day of that month.
 */
const addPeriod = (from, months) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '')) return '';
  const [year, month, day] = from.split('-').map(Number);
  const target = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  // The day it renews on; past the month's end that is the 1st of the next month
  const end = day > lastDay
    ? new Date(target.getFullYear(), target.getMonth() + 1, 1)
    : new Date(target.getFullYear(), target.getMonth(), day);
  end.setDate(end.getDate() - 1);
  return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
};

// Which quick period a saved from / to pair matches, if any
const matchPeriod = (from, to) => PERIODS.find((period) => to && addPeriod(from, period.months) === to)?.months || null;

const buildForm = (document, preset) => {
  const validFrom = toDayInput(document?.validFrom) || preset?.validFrom || '';
  const savedTo = toDayInput(document?.validTo) || '';
  // A renewal (preset with a start date) gets its Valid To worked out straight away
  const validTo = savedTo || (validFrom && !document ? addPeriod(validFrom, DEFAULT_MONTHS) : '');
  return {
    vehicleId: String(document?.vehicleId || preset?.vehicleId || ''),
    docType: document?.docType || preset?.docType || 'insurance',
    title: document?.title || preset?.title || '',
    documentNumber: document?.documentNumber || preset?.documentNumber || '',
    validFrom,
    validTo,
    notes: document?.notes || '',
    files: Array.isArray(document?.files) ? document.files : []
  };
};

const vehicleText = (vehicle) => {
  const type = getVehicleCategoryLabel(vehicle.category);
  return type ? `${vehicle.vehicleNo} (${type})` : vehicle.vehicleNo;
};

/** Vehicle search box: type to search, arrow keys move, Enter picks, Esc closes the list. */
function VehiclePicker({ options, value, onPick, autoFocus }) {
  const boxRef = useRef(null);
  const [query, setQuery] = useState(null); // null: show the picked vehicle instead of a search
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selected = options.find((option) => option.value === value) || null;
  const shown = useMemo(() => {
    const needle = String(query || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!needle) return options;
    return options.filter((option) => option.label.toLowerCase().replace(/\s+/g, '').includes(needle));
  }, [options, query]);
  const style = useFloatingDropdownPosition(boxRef, open, [shown.length, active]);

  const openList = () => {
    setOpen(true);
    setActive(Math.max(0, options.findIndex((option) => option.value === value)));
  };
  const close = () => {
    setOpen(false);
    setQuery(null);
  };
  const pick = (option) => {
    onPick(option.value);
    close();
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      if (!open) {
        openList();
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => Math.max(0, Math.min(shown.length - 1, current + step)));
    } else if (event.key === 'Enter' && open && shown[active]) {
      // Pick here; the popup's own Enter (move to the next field) runs on the next press
      event.preventDefault();
      event.stopPropagation();
      pick(shown[active]);
    } else if (event.key === 'Escape' && open) {
      // Close the list only, not the popup
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  return (
    <div
      ref={boxRef}
      className="relative"
      onBlurCapture={(event) => {
        if (boxRef.current?.contains(event.relatedTarget)) return;
        close();
      }}
    >
      {open
        ? <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        : <Truck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
      <input
        id="doc-vehicle"
        className="input pl-9 pr-9 font-semibold"
        type="text"
        value={query ?? (selected ? selected.label : '')}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }}
        onFocus={(event) => { openList(); event.target.select(); }}
        onClick={() => { if (!open) openList(); }}
        onKeyDown={onKeyDown}
        placeholder="Search vehicle number"
        autoComplete="off"
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded={open}
      />
      <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      {open && style && (
        <OptionList
          style={style}
          options={shown}
          activeIndex={active}
          emptyText="No vehicle found. Add it in Vehicles first."
          getKey={(option) => option.value}
          getLabel={(option) => option.label}
          isSelected={(option) => option.value === value}
          onHover={setActive}
          onPick={pick}
        />
      )}
    </div>
  );
}

/**
 * Add or edit one vehicle paper: which vehicle, which document, its number, the days it is valid and its photos / PDFs.
 * preset: starting values for a new document (e.g. renewing an expiring one).
 */
export default function AddDocumentPopup({ document = null, preset = null, vehicles = [], onClose, onSaved }) {
  const [formData, setFormData] = useState(() => buildForm(document, preset));
  // The quick period Valid To follows; null once Valid To is typed by hand (then Valid From no longer changes it)
  const [periodMonths, setPeriodMonths] = useState(() => {
    const initial = buildForm(document, preset);
    if (!initial.validTo) return DEFAULT_MONTHS;
    return matchPeriod(initial.validFrom, initial.validTo);
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const isEditing = Boolean(document?._id);
  const typeInfo = DOCUMENT_TYPES.find((type) => type.value === formData.docType);

  const vehicleOptions = useMemo(() => {
    const list = vehicles.map((vehicle) => ({ value: String(vehicle._id), label: vehicleText(vehicle) }));
    if (formData.vehicleId && !list.some((option) => option.value === formData.vehicleId)) {
      list.unshift({ value: formData.vehicleId, label: document?.vehicleNo || 'Deleted vehicle' });
    }
    return list;
  }, [vehicles, formData.vehicleId, document?.vehicleNo]);

  const update = (changes) => {
    setFormData((prev) => ({ ...prev, ...changes }));
    setError('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    update({ [name]: value });
  };

  const handleValidFromChange = (event) => {
    const validFrom = event.target.value;
    // Valid To follows the start date unless it was typed by hand
    if (periodMonths && validFrom) update({ validFrom, validTo: addPeriod(validFrom, periodMonths) });
    else update({ validFrom });
  };

  const handleValidToChange = (event) => {
    const validTo = event.target.value;
    setPeriodMonths(matchPeriod(formData.validFrom, validTo));
    update({ validTo });
  };

  const choosePeriod = (months) => {
    setPeriodMonths(months);
    if (formData.validFrom) update({ validTo: addPeriod(formData.validFrom, months) });
  };

  const uploadFiles = async (picked) => {
    if (picked.length === 0) return;

    const wrong = picked.find((file) => !ALLOWED_TYPES.includes(file.type));
    if (wrong) {
      setError(`${wrong.name}: only JPG, PNG, WEBP or PDF files can be saved`);
      return;
    }
    const tooBig = picked.find((file) => file.size > MAX_FILE_BYTES);
    if (tooBig) {
      setError(`${tooBig.name} is larger than 5 MB`);
      return;
    }

    setUploading(true);
    setError('');
    try {
      const uploaded = [];
      for (const file of picked) {
        const body = new FormData();
        body.append('document', file);
        const response = await apiClient.post('/uploads/document', body, { headers: { 'Content-Type': 'multipart/form-data' } });
        const url = response?.url || response?.relativePath;
        if (url) uploaded.push({ url, name: file.name, mimeType: file.type });
      }
      setFormData((prev) => ({ ...prev, files: [...prev.files, ...uploaded] }));
    } catch (uploadError) {
      setError(uploadError?.message || 'Could not upload the file');
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
    uploadFiles(picked);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (!uploading) uploadFiles(Array.from(event.dataTransfer?.files || []));
  };

  const removeFile = (url) => {
    setFormData((prev) => ({ ...prev, files: prev.files.filter((file) => file.url !== url) }));
  };

  const handleSubmit = async () => {
    if (saving || uploading) return;
    if (!formData.vehicleId) {
      setError('Choose the vehicle');
      return;
    }
    if (formData.docType === 'other' && !formData.title.trim()) {
      setError('Enter the document name');
      return;
    }
    if (typeInfo?.expires && !formData.validTo) {
      setError('Enter the valid to date so its expiry can be tracked');
      return;
    }
    if (formData.validFrom && formData.validTo && formData.validTo < formData.validFrom) {
      setError('Valid to cannot be before valid from');
      return;
    }

    const payload = {
      vehicleId: formData.vehicleId,
      docType: formData.docType,
      title: formData.title.trim(),
      documentNumber: formData.documentNumber.trim(),
      validFrom: formData.validFrom || null,
      validTo: formData.validTo || null,
      notes: formData.notes.trim(),
      files: formData.files
    };

    try {
      setSaving(true);
      if (isEditing) {
        await apiClient.put(`/vehicle-documents/${document._id}`, payload);
      } else {
        await apiClient.post('/vehicle-documents', payload);
      }
      toast.success(isEditing ? 'Document updated' : 'Document saved', { autoClose: 1200 });
      onSaved();
    } catch (submitError) {
      setError(submitError?.message || 'Error saving document');
    } finally {
      setSaving(false);
    }
  };

  // How the dates read once saved: "Valid till 04 Nov 2027 · 364 days left"
  const status = formData.validTo ? getExpiryStatus({ validFrom: formData.validFrom, validTo: formData.validTo }) : null;
  const statusTone = !status ? '' : status.key === 'expired'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : status.key === 'soon' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800';

  return (
    <FormPopup
      title={isEditing ? 'Edit Document' : 'Add Document'}
      subtitle="RC, tax, fitness, permit, insurance and other vehicle papers"
      submitLabel={saving ? 'Saving...' : uploading ? 'Uploading...' : isEditing ? 'Update Document' : 'Save Document'}
      submitDisabled={saving || uploading}
      maxWidth="max-w-xl"
      onSubmit={handleSubmit}
      onClose={onClose}
      onKeyDown={(event) => handlePopupFormKeyDown(event, onClose)}
    >
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      <FormSection number={1} title="Vehicle & Document" tone="blue">
        <div>
          <label className="label" htmlFor="doc-vehicle">Vehicle <span className="text-rose-500">*</span></label>
          <VehiclePicker
            options={vehicleOptions}
            value={formData.vehicleId}
            onPick={(vehicleId) => update({ vehicleId })}
            autoFocus={!formData.vehicleId}
          />
        </div>

        <div>
          <p className="label">Document <span className="text-rose-500">*</span></p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Document type">
            {DOCUMENT_TYPES.map((type) => {
              const active = formData.docType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  title={type.fullLabel}
                  onClick={() => update({ docType: type.value })}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition sm:text-sm ${
                    active
                      ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50'
                  }`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-slate-500">{typeInfo?.fullLabel}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="doc-title">
              {formData.docType === 'other' ? <>Document Name <span className="text-rose-500">*</span></> : 'Label'}
            </label>
            <input
              id="doc-title"
              className="input"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder={formData.docType === 'other' ? 'e.g. Mining pass' : 'Optional, e.g. National'}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="label" htmlFor="doc-number">Document / Policy No.</label>
            <input id="doc-number" className="input" type="text" name="documentNumber" value={formData.documentNumber} onChange={handleChange} placeholder="Optional" autoComplete="off" />
          </div>
        </div>
      </FormSection>

      <FormSection
        number={2}
        title="Validity"
        tone="emerald"
        hint={typeInfo?.expires ? 'Pick Valid From; Valid To fills in for the period chosen below.' : 'Leave Valid To empty if this document does not expire.'}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="doc-valid-from">Valid From</label>
            <input id="doc-valid-from" className="input" type="date" name="validFrom" value={formData.validFrom} onChange={handleValidFromChange} />
          </div>
          <div>
            <label className="label" htmlFor="doc-valid-to">Valid To {typeInfo?.expires && <span className="text-rose-500">*</span>}</label>
            <input id="doc-valid-to" className="input" type="date" name="validTo" value={formData.validTo} min={formData.validFrom || undefined} onChange={handleValidToChange} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500">Valid for</span>
          {PERIODS.map((period) => {
            const active = periodMonths === period.months;
            return (
              <button
                key={period.months}
                type="button"
                onClick={() => choosePeriod(period.months)}
                aria-pressed={active}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                  active
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                {period.label}
              </button>
            );
          })}
          {!periodMonths && formData.validTo && <span className="text-xs text-slate-400">Custom date</span>}
        </div>

        {status && (
          <p className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${statusTone}`}>
            <CalendarCheck size={15} className="shrink-0" />
            <span>
              Valid till {formatDayInput(formData.validTo)}
              {status.daysLeft !== null && ` · ${describeDaysLeft(status.daysLeft)}`}
              {status.key === 'upcoming' && ' · starts later'}
            </span>
          </p>
        )}
      </FormSection>

      <FormSection number={3} title="Photo / PDF & Notes" tone="slate">
        <div
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed px-3 py-4 text-center transition ${dragging ? 'border-primary-400 bg-primary-50' : 'border-slate-300 bg-white'}`}
        >
          <UploadCloud size={24} className="mx-auto text-slate-400" />
          <p className="mt-1 text-sm font-semibold text-slate-700">{uploading ? 'Uploading…' : 'Drop files here, or'}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Paperclip size={16} /> Choose File
            </button>
            <button type="button" className="btn-secondary md:hidden" onClick={() => cameraInputRef.current?.click()} disabled={uploading}>
              <Camera size={16} /> Take Photo
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">JPG, PNG, WEBP or PDF, up to 5 MB each. You can add front and back.</p>
        </div>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple hidden onChange={handleFiles} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFiles} />

        {formData.files.length > 0 && (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {formData.files.map((file) => (
              <li key={file.url} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
                <a href={file.url} target="_blank" rel="noreferrer" className="block">
                  {isImageFile(file) ? (
                    <img src={file.url} alt={file.name || 'Document'} className="h-20 w-full object-cover" />
                  ) : (
                    <span className="flex h-20 w-full items-center justify-center bg-rose-50 text-rose-600"><FileText size={28} /></span>
                  )}
                  <span className="block truncate px-2 py-1 text-[11px] font-medium text-slate-600">{file.name || 'File'}</span>
                </a>
                <button
                  type="button"
                  aria-label="Remove file"
                  title="Remove file"
                  className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-600 shadow hover:text-rose-600"
                  onClick={() => removeFile(file.url)}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div>
          <label className="label" htmlFor="doc-notes">Notes</label>
          <input id="doc-notes" className="input" type="text" name="notes" value={formData.notes} onChange={handleChange} placeholder="e.g. insurance company, agent number" />
        </div>
      </FormSection>
    </FormPopup>
  );
}
