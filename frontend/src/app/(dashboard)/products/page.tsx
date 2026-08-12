'use client';

import dynamic from 'next/dynamic';

import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { fetcher } from '@/lib/fetcher';
import { Product, Category } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { useCameraScanner } from '@/hooks/useCameraScanner';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  Package,
  Printer,
  Camera,
  FileDown
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { useReactToPrint } from 'react-to-print';
import { exportToExcel } from '@/lib/exportToExcel';

// ─── Barcode Label ─────────────────────────────────────────────────────────
function BarcodeLabel({ product }: { product: Product }) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && product.barcode) {
      JsBarcode(barcodeRef.current, product.barcode, {
        format: 'CODE128',
        width: 1.5,
        height: 40,
        displayValue: true,
        fontSize: 10,
        margin: 4,
        background: '#ffffff',
        lineColor: '#000000',
      });
    }
  }, [product.barcode]);

  return (
    <div className="bg-white p-3 rounded text-black text-center" style={{ width: '60mm' }}>
      <p className="text-xs font-bold truncate">{product.name}</p>
      {product.size && <p className="text-xs">Р-р: {product.size}</p>}
      <svg ref={barcodeRef} className="w-full" />
      <p className="text-sm font-bold mt-1">{product.sellingPrice.toLocaleString('ru-KG')} сом</p>
    </div>
  );
}

const ProductModal = dynamic(() => import('./components/ProductModal'), { ssr: false });
const ProductDetailModal = dynamic(() => import('./components/ProductDetailModal'), { ssr: false });

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editProduct, setEditProduct] = useState<Partial<Product> | null | false>(false);
  const [printProduct, setPrintProduct] = useState<Product | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [scanError, setScanError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);
  
  const debouncedSearch = useDebounce(search, 300);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  const { data: productsData, isLoading: isProductsLoading, mutate: mutateProducts } = useSWR<Product[]>(
    `/products?search=${debouncedSearch}&categoryId=${selectedCategory}`,
    fetcher,
    { keepPreviousData: true }
  );

  const { data: categoriesData, isLoading: isCategoriesLoading } = useSWR<Category[]>(
    '/products/categories',
    fetcher
  );

  const products = productsData || [];
  const categories = categoriesData || [];
  const isLoading = isProductsLoading || isCategoriesLoading;

  // Handle camera scan — find product and show detail card
  const handleCameraScan = async ({ text }: { text: string }) => {
    setScanError('');
    try {
      const { data: product } = await api.get<Product>(`/products/barcode/${text}`);
      setScannedProduct(product);
    } catch {
      setScanError(`Товар с штрих-кодом "${text}" не найден`);
      // Auto-clear after 4 sec
      setTimeout(() => setScanError(''), 4000);
    }
  };

  const { ScannerModal, openScanner } = useCameraScanner({
    onScan: handleCameraScan,
    title: 'Найти товар по штрих-коду',
    continuous: false,
  });

  const handleSave = async (data: Record<string, unknown>) => {
    if (editProduct && (editProduct as Product).id) {
      await api.put(`/products/${(editProduct as Product).id}`, data);
    } else {
      await api.post('/products', data);
    }
    mutateProducts();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить товар?')) return;
    await api.delete(`/products/${id}`);
    mutateProducts();
  };

  const margin = (p: Product) =>
    p.costPrice > 0
      ? Math.round(((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100)
      : 0;

  const handleExport = () => {
    const exportData = products.map(p => ({
      'ID': p.id,
      'Название': p.name,
      'Категория': p.category?.name || 'Без категории',
      'SKU': p.SKU,
      'Штрих-код': p.barcode || '',
      'Размер': p.size || '',
      'Цвет': p.color || '',
      'Себестоимость': p.costPrice,
      'Цена продажи': p.sellingPrice,
      'Остаток шт': p.stock
    }));
    exportToExcel(exportData, 'Остатки_Товаров_Jannat', 'Остатки');
  };

  return (
    <AuthGuard allowedRoles={['OWNER', 'ADMIN']}>
      {ScannerModal}

      <div className="space-y-6 animate-slide-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-accent" /> Товары
          </h1>
          <div className="flex gap-2">
            <button 
              onClick={handleExport}
              className="btn-secondary flex items-center gap-2"
            >
              <FileDown className="w-4 h-4 text-green-400" />
              Экспорт
            </button>
            <button
              onClick={() => setEditProduct({})}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Добавить товар
            </button>
          </div>
        </div>

        {/* Scan error notification */}
        {scanError && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm animate-slide-in">
            <X className="w-4 h-4 flex-shrink-0" />
            {scanError}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              className="input !pl-10"
              placeholder="Поиск по названию, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* Camera search button */}
          <button
            onClick={openScanner}
            className="btn-secondary flex items-center gap-2 whitespace-nowrap"
          >
            <Camera className="w-4 h-4 text-accent" />
            Сканировать
          </button>
          <select
            className="input w-44"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Products Table */}
        <div className="card p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="hidden md:table-header-group">
                  <tr className="border-b border-subtle bg-surface-2">
                    <th className="text-left px-4 py-3 font-medium text-muted">Товар</th>
                    <th className="text-left px-4 py-3 font-medium text-muted">SKU / Баркод</th>
                    <th className="text-left px-4 py-3 font-medium text-muted">Размер/Цвет</th>
                    <th className="text-right px-4 py-3 font-medium text-muted">Себест.</th>
                    <th className="text-right px-4 py-3 font-medium text-muted">Цена</th>
                    <th className="text-right px-4 py-3 font-medium text-muted">Маржа</th>
                    <th className="text-right px-4 py-3 font-medium text-muted">Остаток</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="flex flex-col md:table-row-group divide-y divide-subtle">
                  {products.map((product) => (
                    <tr key={product.id} className="flex flex-col md:table-row bg-surface md:hover:bg-surface-2 transition-colors border-b border-subtle md:border-b-0 p-4 md:p-0">
                      <td className="md:px-4 md:py-3 mb-2 md:mb-0">
                        <div className="flex justify-between items-start md:block">
                          <div>
                            <a href={`/products/${product.id}`} className="font-medium text-text-primary hover:text-accent transition-colors text-base md:text-sm">
                              {product.name}
                            </a>
                            <p className="text-sm md:text-xs text-muted mt-0.5 md:mt-0">{product.category?.name}</p>
                          </div>
                          <span className={`md:hidden badge ${product.stock === 0 ? 'badge-danger' : product.stock <= 5 ? 'badge-warning' : 'badge-success'}`}>
                            {product.stock} шт.
                          </span>
                        </div>
                      </td>
                      <td className="md:px-4 md:py-3 mb-2 md:mb-0">
                        <div className="flex justify-between items-center md:block">
                          <span className="md:hidden text-muted">SKU / Баркод:</span>
                          <div className="text-right md:text-left">
                            <p className="font-mono text-xs text-text-primary">{product.SKU}</p>
                            <p className="font-mono text-xs text-muted">{product.barcode || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="md:px-4 md:py-3 mb-2 md:mb-0 text-xs">
                        <div className="flex justify-between items-center md:block">
                          <span className="md:hidden text-muted">Размер / Цвет:</span>
                          <span className="text-text-primary md:text-muted">{[product.size, product.color].filter(Boolean).join(' / ') || '—'}</span>
                        </div>
                      </td>
                      <td className="md:px-4 md:py-3 mb-2 md:mb-0 text-right">
                        <div className="flex justify-between items-center md:block">
                          <span className="md:hidden text-muted">Себест.:</span>
                          <span className="text-text-primary md:text-muted">{product.costPrice.toLocaleString('ru-KG')} с.</span>
                        </div>
                      </td>
                      <td className="md:px-4 md:py-3 mb-2 md:mb-0 text-right">
                        <div className="flex justify-between items-center md:block">
                          <span className="md:hidden text-muted">Цена:</span>
                          <span className="font-semibold text-text-primary">{product.sellingPrice.toLocaleString('ru-KG')} с.</span>
                        </div>
                      </td>
                      <td className="md:px-4 md:py-3 mb-3 md:mb-0 text-right">
                        <div className="flex justify-between items-center md:block">
                          <span className="md:hidden text-muted">Маржа:</span>
                          <span className={margin(product) >= 30 ? 'text-green-400' : margin(product) >= 15 ? 'text-yellow-400' : 'text-red-400'}>
                            {margin(product)}%
                          </span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-right">
                        <span className={`badge ${product.stock === 0 ? 'badge-danger' : product.stock <= 5 ? 'badge-warning' : 'badge-success'}`}>
                          {product.stock} шт.
                        </span>
                      </td>
                      <td className="md:px-4 md:py-3 pt-3 md:pt-0 border-t border-subtle md:border-t-0">
                        <div className="flex items-center gap-2 justify-end">
                          <a
                            href={`/products/${product.id}`}
                            className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-lg md:rounded text-muted bg-surface-2 md:bg-transparent hover:text-accent md:hover:bg-accent/10 transition-colors"
                            title="Детали товара"
                          >
                            <Search className="w-5 h-5 md:w-4 md:h-4" />
                          </a>
                          <button
                            onClick={() => {
                              setPrintProduct(product);
                              setTimeout(() => handlePrint(), 100);
                            }}
                            className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-lg md:rounded text-muted bg-surface-2 md:bg-transparent hover:text-accent md:hover:bg-accent/10 transition-colors"
                            title="Печать этикетки"
                          >
                            <Printer className="w-5 h-5 md:w-4 md:h-4" />
                          </button>
                          <button
                            onClick={() => setEditProduct(product)}
                            className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-lg md:rounded text-muted bg-surface-2 md:bg-transparent hover:text-blue-400 md:hover:bg-blue-500/10 transition-colors"
                          >
                            <Pencil className="w-5 h-5 md:w-4 md:h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-lg md:rounded text-muted bg-surface-2 md:bg-transparent hover:text-red-400 md:hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {products.length === 0 && (
                <div className="text-center py-12 text-muted">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Товары не найдены</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hidden barcode label for print */}
        <div className="hidden">
          <div ref={printRef}>
            {printProduct && <BarcodeLabel product={printProduct} />}
          </div>
        </div>

        {/* Product detail modal after camera scan */}
        {scannedProduct && (
          <ProductDetailModal
            product={scannedProduct}
            onClose={() => setScannedProduct(null)}
            onEdit={() => {
              setEditProduct(scannedProduct);
              setScannedProduct(null);
            }}
          />
        )}

        {/* Product edit/create modal */}
        {editProduct !== false && (
          <ProductModal
            product={editProduct}
            categories={categories}
            onClose={() => setEditProduct(false)}
            onSave={handleSave}
          />
        )}
      </div>
    </AuthGuard>
  );
}
