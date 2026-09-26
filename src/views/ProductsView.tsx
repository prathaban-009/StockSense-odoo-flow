import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Edit2,
  Building2,
  Download,
  FileSpreadsheet,
  Check,
  ChevronDown,
  X,
  HardHat,
  EyeOff,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Location, Product, ProductCategory } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface ProductsViewProps {
  initialFilter?: string;
  onNavigateToOperations?: (type?: string) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ initialFilter, onNavigateToOperations }) => {
  const { user } = useAuth();
  const isStaff = user?.role === 'Warehouse Staff';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(initialFilter === 'low_stock');

  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewStockProduct, setViewStockProduct] = useState<Product | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // New product form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [uom, setUom] = useState('Units');
  const [costPrice, setCostPrice] = useState('3000.00');
  const [salePrice, setSalePrice] = useState('4500.00');
  const [minReorderLevel, setMinReorderLevel] = useState(10);
  const [reorderQty, setReorderQty] = useState(50);
  const [description, setDescription] = useState('');
  const [initialStock, setInitialStock] = useState(50);
  const [initialLocationId, setInitialLocationId] = useState<number | undefined>(undefined);

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [prodsData, catsData, locsData] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getLocations(),
      ]);
      setProducts(prodsData);
      setCategories(catsData);
      setLocations(locsData);
      if (!initialLocationId && locsData.length > 0) {
        setInitialLocationId(locsData[0].id);
      }
      if (!categoryId && catsData.length > 0) {
        setCategoryId(catsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStaff) return; // Block staff from creating products
    setFormLoading(true);
    setFormError(null);

    try {
      await api.createProduct({
        name,
        sku,
        categoryId,
        uom,
        costPrice,
        salePrice,
        minReorderLevel,
        reorderQty,
        description,
        initialStock,
        initialLocationId,
      });

      setShowNewModal(false);
      setName('');
      setSku('');
      setDescription('');
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create product');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStaff || !editingProduct) return;
    setFormLoading(true);

    try {
      await api.updateProduct(editingProduct.id, {
        costPrice: editingProduct.costPrice,
        salePrice: editingProduct.salePrice,
        minReorderLevel: editingProduct.minReorderLevel,
        reorderQty: editingProduct.reorderQty,
        description: editingProduct.description,
      });
      setEditingProduct(null);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update product');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (filterLowStockOnly && p.onHand > (p.minReorderLevel ?? 10)) return false;
    if (selectedCategory !== 'all' && String(p.categoryId) !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      const matchCat = (p.categoryName || '').toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchCat) return false;
    }
    return true;
  });

  const handleDownloadCSV = (exportAll = false) => {
    const itemsToExport = exportAll ? products : filteredProducts;
    if (itemsToExport.length === 0) {
      alert('No product records available to export.');
      return;
    }

    const escapeCSV = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    // Staff receives floor operational fields without sensitive financial margins
    const headers = isStaff
      ? [
          'Product ID',
          'Product Name',
          'SKU Code',
          'Category',
          'Unit of Measure',
          'On Hand Stock',
          'Reserved Stock',
          'Free to Use Stock',
          'Safety Minimum Threshold',
          'Stock Status',
          'Location Breakdown',
          'Description',
        ]
      : [
          'Product ID',
          'Product Name',
          'SKU Code',
          'Category',
          'Unit of Measure',
          'Unit Cost (Rs)',
          'Sale Price (Rs)',
          'On Hand Stock',
          'Reserved Stock',
          'Free to Use Stock',
          'Total Asset Value (Rs)',
          'Min Reorder Level',
          'Reorder Quantity',
          'Stock Status',
          'Location Breakdown',
          'Description',
        ];

    const rows = itemsToExport.map((p) => {
      const isLow = p.onHand <= (p.minReorderLevel ?? 10);
      const isOut = p.onHand <= 0;
      const status = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';
      const locationBreakdown = (p.stockPerLocation || [])
        .map((s) => {
          const loc = locations.find((l) => l.id === s.locationId);
          return `${loc?.name || 'Loc #' + s.locationId}: ${s.onHand}`;
        })
        .join('; ');

      if (isStaff) {
        return [
          escapeCSV(p.id),
          escapeCSV(p.name),
          escapeCSV(p.sku),
          escapeCSV(p.categoryName || 'Uncategorized'),
          escapeCSV(p.uom),
          escapeCSV(p.onHand),
          escapeCSV(p.reserved),
          escapeCSV(p.freeToUse),
          escapeCSV(p.minReorderLevel),
          escapeCSV(status),
          escapeCSV(locationBreakdown),
          escapeCSV(p.description || ''),
        ].join(',');
      }

      const assetValue = (p.onHand * Number(p.costPrice || 0)).toFixed(2);
      return [
        escapeCSV(p.id),
        escapeCSV(p.name),
        escapeCSV(p.sku),
        escapeCSV(p.categoryName || 'Uncategorized'),
        escapeCSV(p.uom),
        escapeCSV(p.costPrice),
        escapeCSV(p.salePrice),
        escapeCSV(p.onHand),
        escapeCSV(p.reserved),
        escapeCSV(p.freeToUse),
        escapeCSV(assetValue),
        escapeCSV(p.minReorderLevel),
        escapeCSV(p.reorderQty),
        escapeCSV(status),
        escapeCSV(locationBreakdown),
        escapeCSV(p.description || ''),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    const filterSuffix = exportAll ? 'all_inventory' : (filterLowStockOnly ? 'low_stock' : 'filtered');
    const roleSuffix = isStaff ? 'floor_mode' : 'admin';
    link.setAttribute('href', url);
    link.setAttribute('download', `stocksense_${roleSuffix}_inventory_${filterSuffix}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    setShowExportMenu(false);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white dark:bg-[#0F172A] p-5 sm:p-6 rounded-lg border border-[#E2E8F0] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Products &amp; Stock Availability
            </h1>
            {isStaff && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                <EyeOff className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>Floor View (Costs Hidden)</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isStaff
              ? 'Physical stock levels, warehouse bins, reserved counts, and SKU identification for floor operations.'
              : 'Enterprise catalogue items, unit costs, pricing, on-hand counts, and minimum safety replenishment levels.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto relative">
          {/* Download CSV Action Button & Options Dropdown */}
          <div className="relative">
            <div className="inline-flex rounded-md shadow-xs">
              <button
                onClick={() => handleDownloadCSV(false)}
                className="px-3.5 py-2 text-xs font-semibold bg-white dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-l-md flex items-center gap-1.5 transition-colors cursor-pointer"
                title={`Download inventory list (${filteredProducts.length} items) as CSV`}
              >
                {downloaded ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                )}
                <span>{downloaded ? 'CSV Exported' : isStaff ? 'Export Floor Sheet' : 'Download CSV'}</span>
              </button>

              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-2 py-2 bg-white dark:bg-slate-800/80 border-y border-r border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-r-md cursor-pointer transition-colors"
                title="CSV Export Options"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* Export Menu Popover */}
            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-[#1E293B] rounded-md shadow-lg border border-[#E2E8F0] dark:border-slate-800 p-1.5 z-30">
                <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#1E40AF] dark:text-blue-400" />
                    {isStaff ? 'Export Floor Stock Sheet' : 'Export Inventory Report'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {isStaff ? 'Exports SKUs, quantities, and bin locations' : 'Exports SKUs, stock levels, location splits, and valuations'}
                  </p>
                </div>

                <div className="p-1 space-y-0.5 text-xs">
                  <button
                    onClick={() => handleDownloadCSV(false)}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#1E40AF] flex items-center justify-between cursor-pointer"
                  >
                    <span>Current Filtered View</span>
                    <span className="font-mono text-[11px] text-slate-500">{filteredProducts.length} items</span>
                  </button>

                  <button
                    onClick={() => handleDownloadCSV(true)}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#1E40AF] flex items-center justify-between cursor-pointer"
                  >
                    <span>Full Catalogue</span>
                    <span className="font-mono text-[11px] text-slate-500">{products.length} items</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* New Product Button: Only visible to Managers */}
          {!isStaff && (
            <button
              onClick={() => setShowNewModal(true)}
              className="px-3.5 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0F172A] p-4 rounded-lg border border-[#E2E8F0] dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product or SKU..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          {isStaff && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
              Role: Warehouse Staff · Storage Bin View
            </span>
          )}

          {/* Low Stock Filter Button */}
          <button
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              filterLowStockOnly
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-semibold'
                : 'border border-[#E2E8F0] dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Low Stock Alert ({products.filter((p) => p.onHand <= (p.minReorderLevel ?? 10)).length})</span>
          </button>
        </div>
      </div>

      {/* Stock Table with Comfortable Enterprise Density (Role-Tailored) */}
      <div className="bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold border-b border-[#E2E8F0] dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 sm:px-5">Product Name</th>
                <th className="py-3 px-4 sm:px-5">SKU Code</th>
                <th className="py-3 px-4 sm:px-5">Category</th>
                {!isStaff ? (
                  <>
                    <th className="py-3 px-4 sm:px-5 text-right">Unit Cost</th>
                    <th className="py-3 px-4 sm:px-5 text-right">Sale Price</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-4 sm:px-5">Primary Storage Zone</th>
                    <th className="py-3 px-4 sm:px-5 text-center">Safety Level</th>
                  </>
                )}
                <th className="py-3 px-4 sm:px-5 text-right">On Hand</th>
                <th className="py-3 px-4 sm:px-5 text-right">Free to Use</th>
                <th className="py-3 px-4 sm:px-5 text-center">UoM</th>
                <th className="py-3 px-4 sm:px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={isStaff ? 8 : 9} className="py-12 text-center text-slate-400">
                    No products found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.onHand <= (p.minReorderLevel ?? 10);
                  const primaryLocId = p.stockPerLocation?.[0]?.locationId;
                  const primaryLocName = locations.find((l) => l.id === primaryLocId)?.name || 'WH/Stock1';

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-blue-50/20 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 sm:px-5">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{p.name}</span>
                          {isLow && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              Low Stock
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">{p.description}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 font-mono font-medium text-slate-600 dark:text-slate-300">
                        {p.sku}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 text-slate-600 dark:text-slate-400">
                        {p.categoryName || 'Uncategorized'}
                      </td>

                      {/* Financials for Manager; Physical storage locations for Staff */}
                      {!isStaff ? (
                        <>
                          <td className="py-3.5 px-4 sm:px-5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                            {Number(p.costPrice).toLocaleString()} Rs
                          </td>
                          <td className="py-3.5 px-4 sm:px-5 text-right font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                            {Number(p.salePrice).toLocaleString()} Rs
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3.5 px-4 sm:px-5 text-slate-700 dark:text-slate-300">
                            <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-medium border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {primaryLocName}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 sm:px-5 text-center font-mono tabular-nums text-slate-500">
                            {p.minReorderLevel ?? 10} {p.uom}
                          </td>
                        </>
                      )}

                      <td className="py-3.5 px-4 sm:px-5 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                        <span className={isLow ? 'text-amber-600 dark:text-amber-400' : ''}>
                          {p.onHand}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 text-right font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                        {p.freeToUse}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 text-center text-slate-500">
                        {p.uom}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewStockProduct(p)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-[#1E40AF] text-slate-700 dark:text-slate-300 rounded text-xs font-medium transition-colors cursor-pointer border border-[#E2E8F0] dark:border-slate-700/80"
                            title="Stock availability per location"
                          >
                            Locations
                          </button>
                          {!isStaff && (
                            <button
                              onClick={() => setEditingProduct(p)}
                              className="p-1 text-slate-400 hover:text-[#1E40AF] dark:hover:text-blue-300 rounded cursor-pointer transition-colors"
                              title="Edit Product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE NEW PRODUCT MODAL (Manager Only) */}
      {showNewModal && !isStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-[#0F172A] rounded-lg shadow-xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden my-6">
            <div className="bg-[#1E40AF] text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Add New Product</h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  Register SKU and initialize warehouse stock levels
                </p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-blue-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-md">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ergonomic Office Desk"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    SKU Code (Unique)
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    placeholder="e.g. DESK-002"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Unit of Measure (UoM)
                  </label>
                  <select
                    value={uom}
                    onChange={(e) => setUom(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
                  >
                    <option value="Units">Units</option>
                    <option value="kg">kg (Kilogram)</option>
                    <option value="meters">meters</option>
                    <option value="box">box</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cost Price (Rs)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white font-mono focus:ring-1 focus:ring-[#1E40AF]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Sale Price (Rs)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white font-mono focus:ring-1 focus:ring-[#1E40AF]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Min Reorder Safety Level
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minReorderLevel}
                    onChange={(e) => setMinReorderLevel(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white font-mono focus:ring-1 focus:ring-[#1E40AF]"
                  />
                </div>
              </div>

              {/* Initial Stock Setup */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-[#E2E8F0] dark:border-slate-700 space-y-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  Initial Stock Setup (Optional)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Initial Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={initialStock}
                      onChange={(e) => setInitialStock(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white font-mono font-medium focus:ring-1 focus:ring-[#1E40AF]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Storage Location</label>
                    <select
                      value={initialLocationId}
                      onChange={(e) => setInitialLocationId(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white focus:ring-1 focus:ring-[#1E40AF]"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description / Specifications
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Material specs, dimensions, barcode info..."
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white focus:ring-1 focus:ring-[#1E40AF]"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-2 font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2 font-semibold bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {formLoading ? 'Saving...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL (Manager Only) */}
      {editingProduct && !isStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-[#0F172A] rounded-lg shadow-xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden my-6">
            <div className="bg-[#1E40AF] text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold">
                  Edit {editingProduct.name}
                </h3>
                <span className="font-mono text-xs text-blue-200">[{editingProduct.sku}]</span>
              </div>
              <button onClick={() => setEditingProduct(null)} className="text-blue-200 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Cost Price (Rs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingProduct.costPrice}
                  onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white font-mono focus:ring-1 focus:ring-[#1E40AF]"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Sale Price (Rs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingProduct.salePrice}
                  onChange={(e) => setEditingProduct({ ...editingProduct, salePrice: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white font-mono focus:ring-1 focus:ring-[#1E40AF]"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Min Reorder Safety Level
                </label>
                <input
                  type="number"
                  value={editingProduct.minReorderLevel}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, minReorderLevel: Number(e.target.value) })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white font-mono focus:ring-1 focus:ring-[#1E40AF]"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Suggested Reorder Quantity
                </label>
                <input
                  type="number"
                  value={editingProduct.reorderQty}
                  onChange={(e) => setEditingProduct({ ...editingProduct, reorderQty: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white font-mono focus:ring-1 focus:ring-[#1E40AF]"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2 font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2 font-semibold bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md transition-colors cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK PER LOCATION MODAL (Accessible to both Staff and Manager) */}
      {viewStockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0F172A] rounded-lg shadow-xl border border-[#E2E8F0] dark:border-slate-800 p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{viewStockProduct.name}</h3>
                <p className="text-xs font-mono text-[#1E40AF] dark:text-blue-400 font-semibold">{viewStockProduct.sku}</p>
              </div>
              <button onClick={() => setViewStockProduct(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Availability by Warehouse Location
              </h4>
              <div className="border border-[#E2E8F0] dark:border-slate-800 rounded-md overflow-hidden divide-y divide-[#E2E8F0] dark:divide-slate-800 text-xs">
                {locations.map((loc) => {
                  const match = viewStockProduct.stockPerLocation?.find((s) => s.locationId === loc.id);
                  const onHand = match?.onHand ?? 0;
                  const reserved = match?.reserved ?? 0;
                  return (
                    <div key={loc.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {loc.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {loc.shortCode} · {loc.locationType}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-slate-900 dark:text-white block tabular-nums">
                          {onHand} {viewStockProduct.uom}
                        </span>
                        {reserved > 0 && (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 block tabular-nums">({reserved} reserved)</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-slate-800 text-right">
              <button
                onClick={() => setViewStockProduct(null)}
                className="px-4 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-medium cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
