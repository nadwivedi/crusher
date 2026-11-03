import { useRef, useState } from 'react';
import { Camera, FileText, Paperclip, X } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../../../utils/api';
import FormPopup from '../../../components/FormPopup';
import { handlePopupFormKeyDown } from '../../../utils/popupFormKeyboard';
import { toDayInput } from '../../../utils/monthlyHire';
import { DOCUMENT_TYPES, isImageFile } from '../../../utils/vehicleDocuments';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const buildForm = (document, preset) => ({
  vehicleId: String(document?.vehicleId || preset?.vehicleId || ''),
  docType: document?.docType || preset?.docType || 'insurance',
  title: document?.title || preset?.title || '',
  documentNumber: document?.documentNumber || preset?.documentNumber || '',
  validFrom: toDayInput(document?.validFrom) || preset?.validFrom || '',
  validTo: toDayInput(document?.validTo) || '',
  notes: document?.notes || '',
  files: Array.isArray(document?.files) ? document.files : []
});

/**
 * Add or edit one vehicle paper: which vehicle, which document, its number, the days it is valid and its photos / PDFs.
 * preset: starting values for a new document (e.g. renewing an expiring one).
 */
export default function AddDocumentPopup({ document = null, preset = null, vehicles = [], onClose, onSaved }) {
  const [formData, setFormData] = useState(() => buildForm(document, preset));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const isEditing = Boolean(document?._id);
  const typeInfo = DOCUMENT_TYPES.find((type) => type.value === formData.docType);
  const vehicleMissing = formData.vehicleId && !vehicles.some((vehicle) => vehicle._id === formData.vehicleId);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleFiles = async (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
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

  return (
    <FormPopup
      title={isEditing ? 'Edit Document' : 'Add Document'}
      subtitle="RC, tax, fitness, permit, insurance and other vehicle papers"
      submitLabel={saving ? 'Saving...' : uploading ? 'Uploading...' : isEditing ? 'Update Document' : 'Save Document'}
      submitDisabled={saving || uploading}
      maxWidth="max-w-lg"
      onSubmit={handleSubmit}
      onClose={onClose}
      onKeyDown={(event) => handlePopupFormKeyDown(event, onClose)}
    >
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="doc-vehicle">Vehicle *</label>
          <select id="doc-vehicle" className="input" name="vehicleId" value={formData.vehicleId} onChange={handleChange} autoFocus={!formData.vehicleId}>
            <option value="">Select vehicle</option>
            {vehicleMissing && <option value={formData.vehicleId}>{document?.vehicleNo || 'Deleted vehicle'}</option>}
            {vehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{vehicle.vehicleNo}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="doc-type">Document *</label>
          <select id="doc-type" className="input" name="docType" value={formData.docType} onChange={handleChange} autoFocus={Boolean(formData.vehicleId)}>
            {DOCUMENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.fullLabel}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="doc-title">{formData.docType === 'other' ? 'Document Name *' : 'Label'}</label>
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="doc-valid-from">Valid From</label>
          <input id="doc-valid-from" className="input" type="date" name="validFrom" value={formData.validFrom} onChange={handleChange} />
        </div>
        <div>
          <label className="label" htmlFor="doc-valid-to">Valid To {typeInfo?.expires ? '*' : ''}</label>
          <input id="doc-valid-to" className="input" type="date" name="validTo" value={formData.validTo} min={formData.validFrom || undefined} onChange={handleChange} />
        </div>
      </div>
      {!typeInfo?.expires && <p className="-mt-1 text-xs text-slate-500">Leave Valid To empty if this document does not expire.</p>}

      <div>
        <p className="label">Photo / PDF</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Paperclip size={16} /> {uploading ? 'Uploading…' : 'Choose File'}
          </button>
          <button type="button" className="btn-secondary md:hidden" onClick={() => cameraInputRef.current?.click()} disabled={uploading}>
            <Camera size={16} /> Take Photo
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple hidden onChange={handleFiles} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFiles} />
        <p className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP or PDF, up to 5 MB each. You can add front and back.</p>

        {formData.files.length > 0 && (
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {formData.files.map((file) => (
              <li key={file.url} className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <a href={file.url} target="_blank" rel="noreferrer" className="block">
                  {isImageFile(file) ? (
                    <img src={file.url} alt={file.name || 'Document'} className="h-20 w-full object-cover" />
                  ) : (
                    <span className="flex h-20 w-full items-center justify-center text-rose-600"><FileText size={28} /></span>
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
      </div>

      <div>
        <label className="label" htmlFor="doc-notes">Notes</label>
        <input id="doc-notes" className="input" type="text" name="notes" value={formData.notes} onChange={handleChange} placeholder="e.g. insurance company, agent number" />
      </div>
    </FormPopup>
  );
}
