import { useMemo, useState } from 'react';
import { Gem, Lock, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import FormPopup from '../components/FormPopup';
import { DEFAULT_MATERIAL_OPTIONS, DEFAULT_MATERIAL_VALUES, getCustomMaterials, toMaterialValue } from '../utils/materials';

const TOAST_OPTIONS = { autoClose: 1200 };
const cleanName = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const formatRate = (value) => (Number(value) > 0 ? `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—');

// The materials a sale can be made of: the usual sizes (fixed, only their rates change) and the ones the owner adds
export default function MaterialTypes() {
  const { user, updateUserSettings } = useAuth();
  const [search, setSearch] = useState('');
  // { mode: 'add' } | { mode: 'edit', row } while the popup is open
  const [popup, setPopup] = useState(null);
  const [form, setForm] = useState({ name: '', rate: '', ratePerCubicMeter: '' });
  const [saving, setSaving] = useState(false);

  const customMaterials = useMemo(() => getCustomMaterials(user), [user]);

  const rows = useMemo(() => {
    const rates = user?.materialRates || {};
    const defaults = DEFAULT_MATERIAL_OPTIONS.map((item) => ({
      key: item.value,
      name: item.label,
      isDefault: true,
      tonKey: item.tonKey,
      cubicKey: item.cubicKey,
      rate: Number(rates[item.tonKey] || 0),
      ratePerCubicMeter: Number(rates[item.cubicKey] || 0)
    }));
    const custom = customMaterials.map((item, index) => ({
      key: `custom-${toMaterialValue(item.name)}`,
      name: item.name,
      isDefault: false,
      index,
      rate: Number(item.rate || 0),
      ratePerCubicMeter: Number(item.ratePerCubicMeter || 0)
    }));
    const query = search.trim().toLowerCase();
    return [...defaults, ...custom].filter((row) => !query || row.name.toLowerCase().includes(query));
  }, [user, customMaterials, search]);

  const openAdd = () => {
    setForm({ name: '', rate: '', ratePerCubicMeter: '' });
    setPopup({ mode: 'add' });
  };

  const openEdit = (row) => {
    setForm({ name: row.name, rate: row.rate || '', ratePerCubicMeter: row.ratePerCubicMeter || '' });
    setPopup({ mode: 'edit', row });
  };

  const closePopup = () => {
    if (!saving) setPopup(null);
  };

  const toPayload = (list) => list.map((item) => ({
    name: cleanName(item.name),
    rate: Number(item.rate || 0),
    ratePerCubicMeter: Number(item.ratePerCubicMeter || 0)
  }));

  const handleSubmit = async () => {
    const row = popup?.row;
    const name = cleanName(form.name);
    const rate = Number(form.rate || 0);
    const ratePerCubicMeter = Number(form.ratePerCubicMeter || 0);
    if (rate < 0 || ratePerCubicMeter < 0) {
      toast.error('Rates cannot be negative');
      return;
    }

    setSaving(true);
    try {
      if (row?.isDefault) {
        // A usual size keeps its name; only its rates change
        await updateUserSettings({
          materialRates: { ...(user?.materialRates || {}), [row.tonKey]: rate, [row.cubicKey]: ratePerCubicMeter }
        });
        toast.success(`${row.name} rates saved`, TOAST_OPTIONS);
      } else {
        if (!name) {
          toast.error('Enter the material name');
          return;
        }
        const value = toMaterialValue(name);
        const taken = DEFAULT_MATERIAL_VALUES.includes(value)
          || customMaterials.some((item, index) => index !== row?.index && toMaterialValue(item.name) === value);
        if (taken) {
          toast.error(`${name} is already in the list`);
          return;
        }
        const next = row
          ? customMaterials.map((item, index) => (index === row.index ? { name, rate, ratePerCubicMeter } : item))
          : [...customMaterials, { name, rate, ratePerCubicMeter }];
        await updateUserSettings({ customMaterials: toPayload(next) });
        toast.success(row ? 'Material updated' : `${name} added`, TOAST_OPTIONS);
      }
      setPopup(null);
    } catch (error) {
      toast.error(error?.message || 'Could not save the material');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Remove ${row.name}? Sales already saved with it stay as they are.`)) return;
    try {
      await updateUserSettings({ customMaterials: toPayload(customMaterials.filter((_, index) => index !== row.index)) });
      toast.success(`${row.name} removed`, TOAST_OPTIONS);
    } catch (error) {
      toast.error(error?.message || 'Could not remove the material');
    }
  };

  const typeBadge = (row) => (row.isDefault
    ? <span className="badge-gray inline-flex items-center gap-1"><Lock size={11} /> Default</span>
    : <span className="badge-green">Added</span>);

  const actions = (row) => (
    <div className="flex items-center justify-end gap-1">
      <button type="button" title={row.isDefault ? 'Edit rates' : 'Edit'} aria-label={`Edit ${row.name}`} className="icon-btn p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600" onClick={() => openEdit(row)}>
        <Pencil size={15} />
      </button>
      {!row.isDefault && (
        <button type="button" title="Remove" aria-label={`Remove ${row.name}`} className="icon-btn p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(row)}>
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );

  const editingDefault = popup?.row?.isDefault;

  return (
    <div className="page-fade-in max-w-5xl space-y-4 px-3 pb-8 pt-4 md:space-y-5 lg:px-6 lg:pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Material Types</h1>
          <p className="page-subtitle">What you sell. The default sizes are always there; add any other material your plant sells.</p>
        </div>
        <button type="button" className="btn-primary inline-flex items-center gap-1.5 px-4" onClick={openAdd}>
          <Plus size={16} /> Add Material
        </button>
      </div>

      <section className="panel">
        <div className="panel-header flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" className="input pl-9" placeholder="Search materials..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <p className="text-xs text-slate-500">
            {DEFAULT_MATERIAL_OPTIONS.length} default · {customMaterials.length} added
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <Gem className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No material matches "{search}"</p>
            <button type="button" className="btn-primary mt-3 inline-flex items-center gap-1.5 px-4" onClick={() => { setForm({ name: cleanName(search), rate: '', ratePerCubicMeter: '' }); setPopup({ mode: 'add' }); }}>
              <Plus size={15} /> Add "{cleanName(search)}"
            </button>
          </div>
        ) : (
          <>
            {/* Phones: one line per material */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((row) => (
                <li key={row.key} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-slate-900">{row.name}</p>
                      {typeBadge(row)}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Ton {formatRate(row.rate)} · Cft {formatRate(row.ratePerCubicMeter)}
                    </p>
                  </div>
                  {actions(row)}
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="tbl-head">Material</th>
                    <th className="tbl-head">Type</th>
                    <th className="tbl-head text-right">Rate per Ton</th>
                    <th className="tbl-head text-right">Rate per Cft</th>
                    <th className="tbl-head w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="tbl-row">
                      <td className="px-5 py-2.5 text-sm font-semibold text-slate-900">{row.name}</td>
                      <td className="px-5 py-2.5">{typeBadge(row)}</td>
                      <td className="px-5 py-2.5 text-right text-sm text-slate-700">{formatRate(row.rate)}</td>
                      <td className="px-5 py-2.5 text-right text-sm text-slate-700">{formatRate(row.ratePerCubicMeter)}</td>
                      <td className="px-5 py-2.5">{actions(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {popup && (
        <FormPopup
          title={popup.mode === 'add' ? 'Add Material' : editingDefault ? `${popup.row.name} Rates` : 'Edit Material'}
          subtitle={editingDefault ? 'A default material: its name stays, set its usual rates' : 'It shows up in Add Sale with these rates'}
          submitLabel={saving ? 'Saving...' : 'Save'}
          submitDisabled={saving}
          onSubmit={handleSubmit}
          onClose={closePopup}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700">Material Name {!editingDefault && <span className="text-red-500">*</span>}</span>
            <input
              type="text"
              className="input"
              value={form.name}
              maxLength={40}
              autoFocus={!editingDefault}
              disabled={editingDefault}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="e.g. 12mm, Murrum, Sand, Boulder"
            />
            {popup.mode === 'edit' && !editingDefault && (
              <span className="mt-1 block text-[11px] text-slate-500">Renaming does not change sales already saved under the old name.</span>
            )}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">Rate per Ton (₹)</span>
              <input type="number" min="0" step="0.01" className="input text-right font-semibold" value={form.rate} autoFocus={editingDefault} onChange={(event) => setForm((current) => ({ ...current, rate: event.target.value }))} placeholder="0" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-700">Rate per Cft (₹)</span>
              <input type="number" min="0" step="0.01" className="input text-right font-semibold" value={form.ratePerCubicMeter} onChange={(event) => setForm((current) => ({ ...current, ratePerCubicMeter: event.target.value }))} placeholder="0" />
            </label>
          </div>
          <p className="text-[11px] text-slate-500">Rates are optional; they fill in on their own when you pick this material in a sale.</p>
        </FormPopup>
      )}
    </div>
  );
}
