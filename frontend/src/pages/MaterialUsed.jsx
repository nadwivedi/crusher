import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { CalendarDays, Package, Truck } from 'lucide-react';
import apiClient from '../utils/api';
import { handlePopupFormKeyDown } from '../utils/popupFormKeyboard';
import { useFloatingDropdownPosition } from '../utils/useFloatingDropdownPosition';

const TOAST_OPTIONS = {
  position: 'top-right',
  autoClose: 2200
};

const initialFormData = {
  vehicle: '',
  materialType: '',
  usedQty: '',
  usedDate: new Date().toISOString().slice(0, 10),
  notes: ''
};

function MaterialUsedForm({
  formData,
  setFormData,
  vehicles,
  materials,
  loading,
  editingId,
  onSave,
  onClose,
  vehicleQuery,
  materialQuery,
  vehicleSectionRef,
  materialSectionRef,
  vehicleInputRef,
  materialInputRef,
  filteredVehicles,
  filteredMaterials,
  vehicleListIndex,
  materialListIndex,
  isVehicleSectionActive,
  isMaterialSectionActive,
  setVehicleListIndex,
  setMaterialListIndex,
  setIsVehicleSectionActive,
  setIsMaterialSectionActive,
  handleVehicleFocus,
  handleMaterialFocus,
  handleVehicleInputChange,
  handleMaterialInputChange,
  handleVehicleInputKeyDown,
  handleMaterialInputKeyDown,
  getVehicleDisplayName,
  getMaterialDisplayName,
  getMaterialStockText,
  selectVehicle,
  selectMaterial
}) {
  const inputClass = 'w-full rounded-lg border border-slate-400 bg-white px-2.5 py-1.5 text-[13px] text-gray-800 transition placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2';
  const labelClass = 'mb-1 block text-[11px] font-semibold text-gray-700 md:text-xs';
  const vehicleDropdownStyle = useFloatingDropdownPosition(vehicleSectionRef, isVehicleSectionActive, [filteredVehicles.length, vehicleListIndex]);
  const materialDropdownStyle = useFloatingDropdownPosition(materialSectionRef, isMaterialSectionActive, [filteredMaterials.length, materialListIndex]);
  const handleCancel = typeof onClose === 'function' ? onClose : () => {};

  return (
    <div className="flex max-h-[88vh] w-full max-w-[30rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
      <div className="bg-[linear-gradient(135deg,#2563eb_0%,#4338ca_55%,#7c3aed_100%)] px-4 py-3 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold md:text-lg">{editingId ? 'Edit Material Used' : 'Add Material Used'}</h2>
            <p className="text-[11px] text-white/80 md:text-xs">Track material consumption and reduce stock automatically.</p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white transition hover:bg-white/20"
              aria-label="Close popup"
            >
              <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800 md:text-base">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">1</span>
            Material Details
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <label className={labelClass}>Used Date</label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-indigo-400" />
                <input
                  type="date"
                  value={formData.usedDate}
                  onChange={(event) => setFormData((prev) => ({ ...prev, usedDate: event.target.value }))}
                  className={`${inputClass} pl-9 focus:ring-indigo-500`}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Vehicle No</label>
              <div
                ref={vehicleSectionRef}
                className="relative"
                onFocusCapture={handleVehicleFocus}
                onBlurCapture={(event) => {
                  const nextFocused = event.relatedTarget;
                  if (vehicleSectionRef.current && nextFocused instanceof Node && vehicleSectionRef.current.contains(nextFocused)) return;
                  setIsVehicleSectionActive(false);
                }}
              >
                <div className="relative">
                  <Truck className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-indigo-400" />
                  <input
                    ref={vehicleInputRef}
                    type="text"
                    value={vehicleQuery}
                    onChange={handleVehicleInputChange}
                    onKeyDown={handleVehicleInputKeyDown}
                    className={`${inputClass} pl-9 focus:ring-indigo-500`}
                    placeholder="Type to search vehicle..."
                    autoComplete="off"
                    autoFocus
                  />
                </div>

                {isVehicleSectionActive && vehicleDropdownStyle && (
                  <div
                    className="fixed z-[80] overflow-hidden rounded-xl border border-amber-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                    style={vehicleDropdownStyle}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Vehicle List</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm">
                        {filteredVehicles.length}
                      </span>
                    </div>
                    <div className="overflow-y-auto py-1" style={{ maxHeight: vehicleDropdownStyle.maxHeight }}>
                      {filteredVehicles.length === 0 ? (
                        <div className="px-3 py-3 text-center text-[13px] text-slate-500">No matching vehicles found.</div>
                      ) : (
                        filteredVehicles.map((vehicle, index) => {
                          const isActive = index === vehicleListIndex;
                          const isSelected = String(formData.vehicle || '') === String(vehicle._id);
                          return (
                            <button
                              key={vehicle._id}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onMouseEnter={() => setVehicleListIndex(index)}
                              onClick={() => selectVehicle(vehicle)}
                              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition ${
                                isActive
                                  ? 'bg-yellow-200 text-amber-950'
                                  : isSelected
                                  ? 'bg-yellow-50 text-amber-800'
                                  : 'text-slate-700 hover:bg-amber-50'
                              }`}
                            >
                              <span className="truncate font-medium">{getVehicleDisplayName(vehicle)}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Material Type</label>
              <div
                ref={materialSectionRef}
                className="relative"
                onFocusCapture={handleMaterialFocus}
                onBlurCapture={(event) => {
                  const nextFocused = event.relatedTarget;
                  if (materialSectionRef.current && nextFocused instanceof Node && materialSectionRef.current.contains(nextFocused)) return;
                  setIsMaterialSectionActive(false);
                }}
              >
                <div className="relative">
                  <Package className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-indigo-400" />
                  <input
                    ref={materialInputRef}
                    type="text"
                    value={materialQuery}
                    onChange={handleMaterialInputChange}
                    onKeyDown={handleMaterialInputKeyDown}
                    className={`${inputClass} pl-9 focus:ring-indigo-500`}
                    placeholder="Type to search material..."
                    autoComplete="off"
                  />
                </div>

                {isMaterialSectionActive && materialDropdownStyle && (
                  <div
                    className="fixed z-[80] overflow-hidden rounded-xl border border-amber-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                    style={materialDropdownStyle}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-amber-100 bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Material List</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm">
                        {filteredMaterials.length}
                      </span>
                    </div>
                    <div className="overflow-y-auto py-1" style={{ maxHeight: materialDropdownStyle.maxHeight }}>
                      {filteredMaterials.length === 0 ? (
                        <div className="px-3 py-3 text-center text-[13px] text-slate-500">No matching materials found.</div>
                      ) : (
                        filteredMaterials.map((material, index) => {
                          const isActive = index === materialListIndex;
                          const isSelected = String(formData.materialType || '') === String(material._id);
                          return (
                            <button
                              key={material._id}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onMouseEnter={() => setMaterialListIndex(index)}
                              onClick={() => selectMaterial(material)}
                              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition ${
                                isActive
                                  ? 'bg-yellow-200 text-amber-950'
                                  : isSelected
                                  ? 'bg-yellow-50 text-amber-800'
                                  : 'text-slate-700 hover:bg-amber-50'
                              }`}
                            >
                              <span className="truncate font-medium">{getMaterialDisplayName(material)}</span>
                              <span className="shrink-0 rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                {getMaterialStockText(material)}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Used Qty</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={formData.usedQty}
                onChange={(event) => setFormData((prev) => ({ ...prev, usedQty: event.target.value }))}
                placeholder="Enter used quantity"
                className={`${inputClass} focus:ring-indigo-500`}
              />
            </div>

            <div className="space-y-1">
              <label className={labelClass}>Notes</label>
              <textarea
                rows="3"
                value={formData.notes}
                onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Optional notes"
                className={`${inputClass} min-h-[84px] resize-none py-2.5 focus:ring-indigo-500`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 md:flex-row">
        <div className="hidden text-[11px] text-gray-600 md:block md:text-xs">
          <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> to close
        </div>

        <div className="flex w-full gap-2 md:w-auto">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-slate-50 md:flex-none md:px-5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="flex-1 rounded-lg bg-[linear-gradient(135deg,#2563eb_0%,#4338ca_100%)] px-5 py-2 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 md:flex-none md:px-6"
          >
            {loading ? 'Saving...' : editingId ? 'Update Material Used' : 'Save Material Used'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MaterialUsed({ modalOnly = false, onModalFinish = null }) {
  const [entries, setEntries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [materialQuery, setMaterialQuery] = useState('');
  const [isVehicleSectionActive, setIsVehicleSectionActive] = useState(false);
  const [isMaterialSectionActive, setIsMaterialSectionActive] = useState(false);
  const [vehicleListIndex, setVehicleListIndex] = useState(-1);
  const [materialListIndex, setMaterialListIndex] = useState(-1);
  const vehicleSectionRef = useRef(null);
  const materialSectionRef = useRef(null);
  const vehicleInputRef = useRef(null);
  const materialInputRef = useRef(null);

  const selectedMaterial = useMemo(
    () => materials.find((material) => material._id === formData.materialType) || null,
    [formData.materialType, materials]
  );

  const getVehicleDisplayName = (vehicle) => String(vehicle?.vehicleNumber || vehicle?.vehicleNo || '').trim();
  const getMaterialDisplayName = (material) => {
    const name = String(material?.name || material?.materialTypeName || '').trim();
    const unit = String(material?.unit || '').trim();
    return unit ? `${name} (${unit})` : name;
  };

  const getMaterialStockText = (material) => {
    const quantity = Number(material?.currentStock ?? material?.stock ?? 0);
    const unit = String(material?.unit || '').trim();
    return `${quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`;
  };

  const filteredVehicles = useMemo(() => {
    const searchValue = String(vehicleQuery || '').trim().toLowerCase();
    if (!searchValue) return vehicles;
    return vehicles.filter((vehicle) => getVehicleDisplayName(vehicle).toLowerCase().includes(searchValue));
  }, [vehicles, vehicleQuery]);

  const filteredMaterials = useMemo(() => {
    const searchValue = String(materialQuery || '').trim().toLowerCase();
    if (!searchValue) return materials;
    return materials.filter((material) => getMaterialDisplayName(material).toLowerCase().includes(searchValue));
  }, [materials, materialQuery]);

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId('');
    setVehicleQuery('');
    setMaterialQuery('');
    setVehicleListIndex(-1);
    setMaterialListIndex(-1);
    setIsVehicleSectionActive(false);
    setIsMaterialSectionActive(false);
  };

  const fetchEntries = async (searchValue = search) => {
    try {
      setFetching(true);
      setError('');
      const response = await apiClient.get('/material-used', { params: { search: searchValue } });
      setEntries(Array.isArray(response) ? response : []);
    } catch (err) {
      setError(err.message || 'Error fetching material used entries');
    } finally {
      setFetching(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [vehicleResponse, materialResponse] = await Promise.all([
        apiClient.get('/vehicles'),
        apiClient.get('/products')
      ]);
      setVehicles(Array.isArray(vehicleResponse) ? vehicleResponse : []);
      setMaterials(
        Array.isArray(materialResponse?.data)
          ? materialResponse.data
          : Array.isArray(materialResponse)
          ? materialResponse
          : []
      );
    } catch (err) {
      setError(err.message || 'Error loading material options');
    }
  };

  useEffect(() => {
    fetchEntries('');
    fetchOptions();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchEntries(search);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const handleSave = async () => {
    if (!formData.materialType) {
      toast.error('Material type is required', TOAST_OPTIONS);
      return;
    }

    if (!(Number(formData.usedQty) > 0)) {
      toast.error('Used quantity must be greater than 0', TOAST_OPTIONS);
      return;
    }

    const payload = {
      vehicle: formData.vehicle || null,
      materialType: formData.materialType,
      usedQty: Number(formData.usedQty),
      usedDate: formData.usedDate || undefined,
      notes: formData.notes
    };

    try {
      setLoading(true);
      if (editingId) {
        await apiClient.put(`/material-used/${editingId}`, payload);
        toast.success('Material used entry updated successfully', TOAST_OPTIONS);
      } else {
        await apiClient.post('/material-used', payload);
        toast.success('Material used entry added successfully', TOAST_OPTIONS);
      }
      resetForm();
      await fetchEntries();
      await fetchOptions();
      if (modalOnly && onModalFinish) {
        onModalFinish();
      }
    } catch (err) {
      toast.error(err.message || 'Error saving material used entry', TOAST_OPTIONS);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingId(entry._id);
    setFormData({
      vehicle: entry.vehicle?._id || '',
      materialType: entry.materialType?._id || '',
      usedQty: entry.usedQty || '',
      usedDate: entry.usedDate ? new Date(entry.usedDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: entry.notes || ''
    });
    setVehicleQuery(entry.vehicleNo || '');
    setMaterialQuery(entry.materialTypeName || entry.materialType?.name || '');
  };

  const handleVehicleFocus = () => {
    setIsVehicleSectionActive(true);
    setVehicleListIndex(filteredVehicles.length > 0 ? 0 : -1);
  };

  const handleMaterialFocus = () => {
    setIsMaterialSectionActive(true);
    setMaterialListIndex(filteredMaterials.length > 0 ? 0 : -1);
  };

  const selectVehicle = (vehicle) => {
    setFormData((prev) => ({ ...prev, vehicle: vehicle?._id || '' }));
    setVehicleQuery(vehicle ? getVehicleDisplayName(vehicle) : '');
    setIsVehicleSectionActive(false);
  };

  const selectMaterial = (material) => {
    setFormData((prev) => ({ ...prev, materialType: material?._id || '' }));
    setMaterialQuery(material ? getMaterialDisplayName(material) : '');
    setIsMaterialSectionActive(false);
  };

  const handleVehicleInputChange = (event) => {
    const value = event.target.value;
    setVehicleQuery(value);
    setIsVehicleSectionActive(true);
    if (!value.trim()) {
      setFormData((prev) => ({ ...prev, vehicle: '' }));
      return;
    }
    const exactMatch = vehicles.find((vehicle) => getVehicleDisplayName(vehicle).toLowerCase() === value.trim().toLowerCase());
    setFormData((prev) => ({ ...prev, vehicle: exactMatch?._id || '' }));
  };

  const handleMaterialInputChange = (event) => {
    const value = event.target.value;
    setMaterialQuery(value);
    setIsMaterialSectionActive(true);
    if (!value.trim()) {
      setFormData((prev) => ({ ...prev, materialType: '' }));
      return;
    }
    const exactMatch = materials.find((material) => getMaterialDisplayName(material).toLowerCase() === value.trim().toLowerCase());
    setFormData((prev) => ({ ...prev, materialType: exactMatch?._id || '' }));
  };

  const handleVehicleInputKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsVehicleSectionActive(true);
      setVehicleListIndex((prev) => (filteredVehicles.length === 0 ? -1 : prev < filteredVehicles.length - 1 ? prev + 1 : 0));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsVehicleSectionActive(true);
      setVehicleListIndex((prev) => (filteredVehicles.length === 0 ? -1 : prev > 0 ? prev - 1 : filteredVehicles.length - 1));
      return;
    }
    if (event.key === 'Enter' && isVehicleSectionActive && filteredVehicles.length > 0) {
      event.preventDefault();
      selectVehicle(filteredVehicles[vehicleListIndex] || filteredVehicles[0]);
    }
  };

  const handleMaterialInputKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsMaterialSectionActive(true);
      setMaterialListIndex((prev) => (filteredMaterials.length === 0 ? -1 : prev < filteredMaterials.length - 1 ? prev + 1 : 0));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsMaterialSectionActive(true);
      setMaterialListIndex((prev) => (filteredMaterials.length === 0 ? -1 : prev > 0 ? prev - 1 : filteredMaterials.length - 1));
      return;
    }
    if (event.key === 'Enter' && isMaterialSectionActive && filteredMaterials.length > 0) {
      event.preventDefault();
      selectMaterial(filteredMaterials[materialListIndex] || filteredMaterials[0]);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this material used entry?')) {
      return;
    }

    try {
      await apiClient.delete(`/material-used/${id}`);
      toast.success('Material used entry deleted successfully', TOAST_OPTIONS);
      if (editingId === id) {
        resetForm();
      }
      await fetchEntries();
      await fetchOptions();
    } catch (err) {
      toast.error(err.message || 'Error deleting material used entry', TOAST_OPTIONS);
    }
  };

  const pageContent = (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(245,243,255,0.96),rgba(238,242,255,0.94))] p-6 shadow-[0_28px_70px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-500">Voucher</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Material Used</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Use this voucher when purchased material is consumed. Stock reduces automatically against the selected material.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Entries</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{entries.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Unit</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{selectedMaterial?.unit || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      <MaterialUsedForm
        formData={formData}
        setFormData={setFormData}
        vehicles={vehicles}
        materials={materials}
        loading={loading}
        editingId={editingId}
        onSave={handleSave}
        onClose={resetForm}
        vehicleQuery={vehicleQuery}
        materialQuery={materialQuery}
        vehicleSectionRef={vehicleSectionRef}
        materialSectionRef={materialSectionRef}
        vehicleInputRef={vehicleInputRef}
        materialInputRef={materialInputRef}
        filteredVehicles={filteredVehicles}
        filteredMaterials={filteredMaterials}
        vehicleListIndex={vehicleListIndex}
        materialListIndex={materialListIndex}
        isVehicleSectionActive={isVehicleSectionActive}
        isMaterialSectionActive={isMaterialSectionActive}
        setVehicleListIndex={setVehicleListIndex}
        setMaterialListIndex={setMaterialListIndex}
        setIsVehicleSectionActive={setIsVehicleSectionActive}
        setIsMaterialSectionActive={setIsMaterialSectionActive}
        handleVehicleFocus={handleVehicleFocus}
        handleMaterialFocus={handleMaterialFocus}
        handleVehicleInputChange={handleVehicleInputChange}
        handleMaterialInputChange={handleMaterialInputChange}
        handleVehicleInputKeyDown={handleVehicleInputKeyDown}
        handleMaterialInputKeyDown={handleMaterialInputKeyDown}
        getVehicleDisplayName={getVehicleDisplayName}
        getMaterialDisplayName={getMaterialDisplayName}
        getMaterialStockText={getMaterialStockText}
        selectVehicle={selectVehicle}
        selectMaterial={selectMaterial}
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-bold text-slate-900">Material Usage History</p>
            <p className="mt-1 text-sm text-slate-500">Search by vehicle number, material name, or notes.</p>
          </div>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search material used..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 md:max-w-xs"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600">
                <th className="border-y border-slate-200 px-4 py-3 font-semibold">Used Date</th>
                <th className="border-y border-slate-200 px-4 py-3 font-semibold">Vehicle No</th>
                <th className="border-y border-slate-200 px-4 py-3 font-semibold">Material Type</th>
                <th className="border-y border-slate-200 px-4 py-3 font-semibold">Used Qty</th>
                <th className="border-y border-slate-200 px-4 py-3 font-semibold">Notes</th>
                <th className="border-y border-slate-200 px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-slate-500">Loading material used entries...</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-slate-500">No material used entries found.</td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry._id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-slate-700">
                      {entry.usedDate ? new Date(entry.usedDate).toLocaleDateString('en-GB') : '-'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{entry.vehicleNo || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{entry.materialTypeName || entry.materialType?.name || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{entry.usedQty} {entry.unit || entry.materialType?.unit || ''}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.notes || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(entry)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(entry._id)}
                          className="rounded-lg border border-rose-200 px-3 py-1.5 font-medium text-rose-700 transition hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (modalOnly) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] md:p-6" onClick={onModalFinish}>
        <div onClick={(event) => event.stopPropagation()}>
          <form onSubmit={(event) => { event.preventDefault(); handleSave(); }} onKeyDown={(e) => handlePopupFormKeyDown(e, onModalFinish)}>
            <MaterialUsedForm
              formData={formData}
              setFormData={setFormData}
              vehicles={vehicles}
              materials={materials}
              loading={loading}
              editingId={editingId}
              onSave={handleSave}
              onClose={onModalFinish}
              vehicleQuery={vehicleQuery}
              materialQuery={materialQuery}
              vehicleSectionRef={vehicleSectionRef}
              materialSectionRef={materialSectionRef}
              vehicleInputRef={vehicleInputRef}
              materialInputRef={materialInputRef}
              filteredVehicles={filteredVehicles}
              filteredMaterials={filteredMaterials}
              vehicleListIndex={vehicleListIndex}
              materialListIndex={materialListIndex}
              isVehicleSectionActive={isVehicleSectionActive}
              isMaterialSectionActive={isMaterialSectionActive}
              setVehicleListIndex={setVehicleListIndex}
              setMaterialListIndex={setMaterialListIndex}
              setIsVehicleSectionActive={setIsVehicleSectionActive}
              setIsMaterialSectionActive={setIsMaterialSectionActive}
              handleVehicleFocus={handleVehicleFocus}
              handleMaterialFocus={handleMaterialFocus}
              handleVehicleInputChange={handleVehicleInputChange}
              handleMaterialInputChange={handleMaterialInputChange}
              handleVehicleInputKeyDown={handleVehicleInputKeyDown}
              handleMaterialInputKeyDown={handleMaterialInputKeyDown}
              getVehicleDisplayName={getVehicleDisplayName}
              getMaterialDisplayName={getMaterialDisplayName}
              getMaterialStockText={getMaterialStockText}
              selectVehicle={selectVehicle}
              selectMaterial={selectMaterial}
            />
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.12),transparent_25%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_42%,#f8fafc_100%)] px-4 py-6">
      {pageContent}
    </div>
  );
}
