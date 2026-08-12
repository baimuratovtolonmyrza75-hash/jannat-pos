'use client';

import { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { fetcher } from '@/lib/fetcher';
import { StockEntry, Product, Category } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { useCameraScanner } from '@/hooks/useCameraScanner';
import { useDebounce } from '@/hooks/useDebounce';
import JsBarcode from 'jsbarcode';
import { useReactToPrint } from 'react-to-print';
import {
  Warehouse,
  Plus,
  Search,
  Loader2,
  AlertTriangle,
  TrendingUp,
  X,
  Camera,
  Printer,
  CheckCircle2,
  Package,
} from 'lucide-react';

// ─── Barcode Label for printing ─────────────────────────────────────────────
function BarcodeLabel({ product, count }: { product: Product; count: number }) {
  const refs = Array.from({ length: count }, () => useRef<SVGSVGElement>(null));

  useEffect(() => {
    refs.forEach((ref) => {
      if (ref.current && product.barcode) {
        JsBarcode(ref.current, product.barcode, {
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
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.barcode, count]);

  return (
    <div className="flex flex-wrap gap-2 p-2">
      {refs.map((ref, i) => (
        <div key={i} className="bg-white p-2 text-black text-center border" style={{ width: '60mm' }}>
          <p className="text-xs font-bold truncate">{product.name}</p>
          {product.size && <p className="text-xs">Р-р: {product.size}</p>}
          {product.color && <p className="text-xs">{product.color}</p>}
          <svg ref={ref} className="w-full" />
          <p className="text-sm font-bold mt-1">{product.sellingPrice.toLocaleString('ru-KG')} сом</p>
        </div>
      ))}
    </div>
  );
}

// ─── Print Labels Modal ──────────────────────────────────────────────────────
function PrintLabelsModal({
  product,
  suggestedCount,
  onClose,
}: {
  product: Product;
  suggestedCount: number;
  onClose: () => void;
}) {
  const [count, setCount] = useState(suggestedCount);
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm animate-slide-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold flex items-center gap-2">
            <Printer className="w-5 h-5 text-accent" />
            Печать этикеток
          </h2>
          <button onClick={onClose} className="text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-surface-2 rounded-lg p-3 mb-4">
          <p className="font-medium text-text-primary">{product.name}</p>
          <p className="text-xs text-muted">{product.SKU}</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-muted mb-1">Количество этикеток</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCount(Math.max(1, count - 1))}
              className="w-10 h-10 rounded-lg bg-surface-2 border border-subtle flex items-center justify-center text-lg font-bold"
            >−</button>
            <input
              type="number"
              min="1"
              max="200"
              value={count}
              onChange={(e) => setCount(Math.max(1, +e.target.value))}
              className="input text-center w-20"
            />
            <button
              onClick={() => setCount(count + 1)}
              className="w-10 h-10 rounded-lg bg-surface-2 border border-subtle flex items-center justify-center text-lg font-bold"
            >+</button>
          </div>
        </div>

        {/* Hidden print content */}
        <div className="hidden">
          <div ref={printRef}>
            <BarcodeLabel product={product} count={count} />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Пропустить</button>
          <button
            onClick={() => handlePrint()}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Печатать {count} шт.
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Receive Modal ────────────────────────────────────────────────────────────
function ReceiveModal({
  onClose,
  onSave,
  initialProduct,
  initialBarcode,
}: {
  onClose: () => void;
  onSave: (product: Product, qty: number) => void;
  initialProduct?: Product | null;
  initialBarcode?: string;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mode, setMode] = useState<'existing' | 'new'>(
    initialProduct ? 'existing' : initialBarcode && !initialProduct ? 'new' : 'existing',
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null);
  const [quantity, setQuantity] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // New product form
  const [newForm, setNewForm] = useState({
    name: '',
    categoryId: '',
    SKU: '',
    barcode: initialBarcode || '',
    costPrice: '',
    sellingPrice: '',
    size: '',
    color: '',
    quantity: '1',
  });

  useEffect(() => {
    // Only fetch if mode is existing
    if (mode === 'existing') {
      Promise.all([
        api.get<Product[]>('/products'),
        api.get<Category[]>('/products/categories'),
      ]).then(([prodRes, catRes]) => {
        setProducts(prodRes.data);
        setCategories(catRes.data);
      });
    }
  }, [mode]);

  const handleExistingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !quantity) return;
    setError('');
    setIsLoading(true);
    try {
      await api.post('/inventory/receive', {
        productId: selectedProduct.id,
        quantity: +quantity,
        costPrice: selectedProduct.costPrice,
        sellingPrice: selectedProduct.sellingPrice,
      });
      onSave(selectedProduct, +quantity);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Ошибка');
      setIsLoading(false);
    }
  };

  const handleNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      // Create product first
      const { data: product } = await api.post<Product>('/products', {
        name: newForm.name,
        categoryId: +newForm.categoryId,
        SKU: newForm.SKU,
        costPrice: +newForm.costPrice,
        sellingPrice: +newForm.sellingPrice,
        size: newForm.size || undefined,
        color: newForm.color || undefined,
      });

      // Then receive stock
      await api.post('/inventory/receive', {
        productId: product.id,
        quantity: +newForm.quantity,
        costPrice: +newForm.costPrice,
        sellingPrice: +newForm.sellingPrice,
      });

      onSave(product, +newForm.quantity);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Ошибка');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg animate-slide-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Приёмка товара
          </h2>
          <button onClick={onClose} className="text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-surface-2 rounded-lg p-1 mb-4">
          <button
            onClick={() => setMode('existing')}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'existing' ? 'bg-surface text-text-primary' : 'text-muted hover:text-text-primary'
            }`}
          >
            Существующий товар
          </button>
          <button
            onClick={() => setMode('new')}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'new' ? 'bg-surface text-text-primary' : 'text-muted hover:text-text-primary'
            }`}
          >
            Новый товар
          </button>
        </div>

        {/* Existing product */}
        {mode === 'existing' && (
          <form onSubmit={handleExistingSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1">Товар</label>
              <select
                className="input"
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const p = products.find((pr) => pr.id === +e.target.value);
                  setSelectedProduct(p || null);
                }}
                required
              >
                <option value="">Выберите товар...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.SKU}) — {p.stock} шт.
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="bg-surface-2 rounded-lg p-3 text-sm grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted text-xs">Текущий остаток</p>
                  <p className="font-semibold text-text-primary">{selectedProduct.stock} шт.</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Цена продажи</p>
                  <p className="font-semibold text-accent">{selectedProduct.sellingPrice.toLocaleString('ru-KG')} с.</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm text-muted mb-1">Количество</label>
              <input
                className="input"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
              <button type="submit" disabled={isLoading || !selectedProduct} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Принять товар
              </button>
            </div>
          </form>
        )}

        {/* New product */}
        {mode === 'new' && (
          <form onSubmit={handleNewSubmit} className="space-y-3">
            {initialBarcode && (
              <div className="bg-accent/10 border border-accent/20 rounded-lg px-3 py-2 text-sm text-accent">
                📷 Штрих-код из сканера: <strong>{initialBarcode}</strong>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-muted mb-1">Название *</label>
                <input className="input" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">SKU *</label>
                <input className="input" value={newForm.SKU} onChange={(e) => setNewForm({ ...newForm, SKU: e.target.value })} required placeholder="уникальный код" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Категория *</label>
                <select className="input" value={newForm.categoryId} onChange={(e) => setNewForm({ ...newForm, categoryId: e.target.value })} required>
                  <option value="">Выберите...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Себест. (сом) *</label>
                <input className="input" type="number" min="0" step="0.01" value={newForm.costPrice} onChange={(e) => setNewForm({ ...newForm, costPrice: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Цена прод. (сом) *</label>
                <input className="input" type="number" min="0" step="0.01" value={newForm.sellingPrice} onChange={(e) => setNewForm({ ...newForm, sellingPrice: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Размер</label>
                <input className="input" value={newForm.size} onChange={(e) => setNewForm({ ...newForm, size: e.target.value })} placeholder="92, 98..." />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Цвет</label>
                <input className="input" value={newForm.color} onChange={(e) => setNewForm({ ...newForm, color: e.target.value })} placeholder="Синий..." />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-muted mb-1">Количество (приход) *</label>
                <input className="input" type="number" min="1" value={newForm.quantity} onChange={(e) => setNewForm({ ...newForm, quantity: e.target.value })} required />
              </div>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
              <button type="submit" disabled={isLoading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Сохранить и принять
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  // After scan/save state
  const [printModalData, setPrintModalData] = useState<{ product: Product; qty: number } | null>(null);
  const [receiveInitialProduct, setReceiveInitialProduct] = useState<Product | null | undefined>(undefined);
  const [receiveInitialBarcode, setReceiveInitialBarcode] = useState<string | undefined>(undefined);

  const { data: entriesData, isLoading: isEntriesLoading, mutate: mutateEntries } = useSWR<StockEntry[]>(
    '/inventory/entries',
    fetcher
  );

  const { data: lowStockData, isLoading: isLowStockLoading, mutate: mutateLowStock } = useSWR<Product[]>(
    '/inventory/low-stock?threshold=5',
    fetcher
  );

  const entries = entriesData || [];
  const lowStock = lowStockData || [];
  const isLoading = isEntriesLoading || isLowStockLoading;

  const loadData = () => {
    mutateEntries();
    mutateLowStock();
  };

  // Handle camera scan result for inventory
  const handleCameraScan = async ({ text }: { text: string }) => {
    try {
      // Try to find by barcode first
      const { data: product } = await api.get<Product>(`/products/barcode/${text}`);
      // Found — open existing receive modal
      setReceiveInitialProduct(product);
      setReceiveInitialBarcode(undefined);
      setShowModal(true);
    } catch {
      // Not found — open new product form with barcode pre-filled
      setReceiveInitialProduct(null);
      setReceiveInitialBarcode(text);
      setShowModal(true);
    }
  };

  const { ScannerModal, openScanner } = useCameraScanner({
    onScan: handleCameraScan,
    title: 'Сканировать товар для приёмки',
    continuous: false,
  });

  const handleSave = (product: Product, qty: number) => {
    setShowModal(false);
    setReceiveInitialProduct(undefined);
    setReceiveInitialBarcode(undefined);
    // Offer to print labels
    setPrintModalData({ product, qty });
    loadData();
  };

  const debouncedSearch = useDebounce(search, 200);

  const filtered = entries.filter((e) =>
    !debouncedSearch ||
    e.product.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    e.product.SKU.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  return (
    <AuthGuard allowedRoles={['OWNER', 'ADMIN']}>
      {ScannerModal}

      <div className="space-y-6 animate-slide-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-accent" /> Склад
          </h1>
          <div className="flex gap-2">
            {/* Camera scan button */}
            <button
              onClick={openScanner}
              className="btn-secondary flex items-center gap-2"
            >
              <Camera className="w-4 h-4 text-accent" />
              Сканировать камерой
            </button>
            {/* Manual receive */}
            <button
              onClick={() => {
                setReceiveInitialProduct(undefined);
                setReceiveInitialBarcode(undefined);
                setShowModal(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Приёмка товаров
            </button>
          </div>
        </div>

        {/* Low stock alert */}
        {lowStock.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <h2 className="font-semibold text-yellow-400">
                Заканчивается ({lowStock.length} товаров — остаток 5 шт. и меньше)
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStock.map((p) => (
                <span key={p.id} className="badge-warning">
                  {p.name} — {p.stock} шт.
                </span>
              ))}
            </div>
          </div>
        )}

        {/* History table */}
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-subtle flex items-center gap-3 flex-wrap">
            <h2 className="font-semibold text-text-primary">История поступлений</h2>
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                className="input !pl-10 w-56"
                placeholder="Поиск..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-subtle bg-surface-2 text-muted">
                  <th className="text-left px-4 py-3 font-medium">Товар</th>
                  <th className="text-right px-4 py-3 font-medium">Кол-во</th>
                  <th className="text-right px-4 py-3 font-medium">Себест.</th>
                  <th className="text-right px-4 py-3 font-medium">Цена прод.</th>
                  <th className="text-left px-4 py-3 font-medium">Принял</th>
                  <th className="text-right px-4 py-3 font-medium">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{entry.product.name}</p>
                      <p className="text-xs text-muted">{entry.product.SKU}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-green-400 font-semibold">+{entry.quantity}</td>
                    <td className="px-4 py-3 text-right text-muted">{entry.costPrice.toLocaleString('ru-KG')}</td>
                    <td className="px-4 py-3 text-right">{entry.sellingPrice.toLocaleString('ru-KG')} с.</td>
                    <td className="px-4 py-3 text-muted text-xs">{entry.createdBy?.email?.split('@')[0]}</td>
                    <td className="px-4 py-3 text-right text-muted text-xs">
                      {new Date(entry.createdAt).toLocaleDateString('ru-KG')}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-muted">
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      Нет поступлений
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Receive Modal */}
      {showModal && (
        <ReceiveModal
          onClose={() => {
            setShowModal(false);
            setReceiveInitialProduct(undefined);
            setReceiveInitialBarcode(undefined);
          }}
          onSave={handleSave}
          initialProduct={receiveInitialProduct}
          initialBarcode={receiveInitialBarcode}
        />
      )}

      {/* Print Labels Modal — appears after successful receive */}
      {printModalData && (
        <PrintLabelsModal
          product={printModalData.product}
          suggestedCount={printModalData.qty}
          onClose={() => setPrintModalData(null)}
        />
      )}
    </AuthGuard>
  );
}
