import { useEffect, useState } from 'react';
import { Package, PackageX, Pencil, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import AddProductPopup from './component/AddProductPopup';
import apiClient from '../../utils/api';

export default function Products() {
  const toastOptions = { autoClose: 1200 };
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/products', {
        params: { search }
      });
      setProducts(response.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Error fetching stock items');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = () => {
    setEditingProduct(null);
    setError('');
    setShowForm(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setError('');
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleProductSaved = async (_savedProduct, { isEditMode } = {}) => {
    toast.success(
      isEditMode ? 'Stock Item updated successfully' : 'Stock Item added successfully',
      toastOptions
    );
    handleCloseForm();
    await fetchProducts();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await apiClient.delete(`/products/${id}`);
      toast.success('Stock Item deleted successfully', toastOptions);
      fetchProducts();
    } catch (err) {
      setError(err.message || 'Error deleting product');
    }
  };

  const handleOpenLedger = (productId) => {
    navigate(`/stock/${productId}`);
  };

  const totalProducts = products.length;
  const lowStockProducts = products.filter((product) => Number(product.currentStock || 0) <= 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="w-full px-3 pb-8 pt-4 md:px-4 lg:px-6 lg:pt-4">
        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mb-5 mt-1 grid grid-cols-2 gap-2 sm:gap-4">
          <div className="group relative overflow-hidden rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200/50 transition-all hover:shadow-md sm:rounded-2xl sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-medium leading-tight text-slate-500 sm:text-xs">Total Stock Items</p>
                <p className="mt-1 text-base font-bold leading-tight text-slate-800 sm:mt-2 sm:text-2xl">{totalProducts}</p>
              </div>
              <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110 sm:flex">
                <Package className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400 opacity-80 sm:h-1" />
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200/50 transition-all hover:shadow-md sm:rounded-2xl sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-medium leading-tight text-slate-500 sm:text-xs">Low Stock</p>
                <p className="mt-1 text-base font-bold leading-tight text-slate-800 sm:mt-2 sm:text-2xl">{lowStockProducts}</p>
              </div>
              <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition-transform group-hover:scale-110 sm:flex">
                <PackageX className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-rose-500 to-orange-400 opacity-80 sm:h-1" />
          </div>
        </div>

        <AddProductPopup
          showForm={showForm}
          product={editingProduct}
          onClose={handleCloseForm}
          onProductSaved={handleProductSaved}
        />

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 px-6 py-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative w-full lg:w-[22%] lg:min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search stock items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <button
                onClick={handleOpenForm}
                className="whitespace-nowrap rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
              >
                + Add Stock Item
              </button>
            </div>
          </div>

          {loading && !showForm ? (
            <div className="px-6 py-10 text-center text-gray-500">Loading...</div>
          ) : products.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-500">
              No stock items found. Create your first stock item!
            </div>
          ) : (
            <div className="rounded-[20px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(241,245,249,0.96)_100%)] p-3 shadow-[0_18px_36px_rgba(15,23,42,0.08)] sm:p-5">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] overflow-hidden whitespace-nowrap border-separate border-spacing-0 text-left text-sm">
                  <thead className="bg-[linear-gradient(135deg,#0f766e_0%,#0d9488_38%,#0891b2_72%,#0284c7_100%)] text-white">
                    <tr>
                      <th className="border border-slate-200 px-4 py-3.5 text-center text-sm font-semibold">Stock Name</th>
                      <th className="border border-slate-200 px-4 py-3.5 text-center text-sm font-semibold">Units</th>
                      <th className="border border-slate-200 px-4 py-3.5 text-center text-sm font-semibold">Current Stock</th>
                      <th className="border border-slate-200 px-4 py-3.5 text-center text-sm font-semibold">Tax Rate</th>
                      <th className="border border-slate-200 px-4 py-3.5 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    {products.map((product) => (
                      <tr
                        key={product._id}
                        className="cursor-pointer transition-colors duration-150 hover:bg-slate-700/[0.06]"
                        onClick={() => handleOpenLedger(product._id)}
                      >
                        <td className="border border-slate-200 px-4 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-slate-800">{product.name}</span>
                            <span className="text-[10px] font-medium text-sky-600 underline underline-offset-2">Open ledger</span>
                          </div>
                        </td>
                        <td className="border border-slate-200 px-4 py-3 text-center">{product.unit || '-'}</td>
                        <td className="border border-slate-200 px-4 py-3 text-center">
                          <span className={`inline-flex min-w-14 items-center justify-center rounded-md px-2.5 py-1 text-xs font-semibold ${
                            Number(product.currentStock || 0) > 0
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {product.currentStock}
                          </span>
                        </td>
                        <td className="border border-slate-200 px-4 py-3 text-center">{Number(product.taxRate || 0)}%</td>
                        <td className="border border-slate-200 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(product);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 bg-white text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                              aria-label={`Edit ${product.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(product._id);
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300/70 bg-white/70 text-slate-500 transition hover:bg-red-50/90 hover:text-red-600"
                              aria-label={`Delete ${product.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
