'use client';

import { useState } from 'react';
import { Product, Category } from '@/lib/types';
import { X, Loader2 } from 'lucide-react';

export default function ProductModal({
  product,
  categories,
  onClose,
  onSave,
}: {
  product: Partial<Product> | null;
  categories: Category[];
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: product?.name || '',
    categoryId: product?.categoryId?.toString() || '',
    SKU: product?.SKU || '',
    costPrice: product?.costPrice?.toString() || '',
    sellingPrice: product?.sellingPrice?.toString() || '',
    size: product?.size || '',
    color: product?.color || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await onSave({
        ...form,
        categoryId: +form.categoryId,
        costPrice: +form.costPrice,
        sellingPrice: +form.sellingPrice,
      });
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Ошибка сохранения');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg animate-slide-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">
            {product?.id ? 'Редактировать товар' : 'Новый товар'}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-muted mb-1">Название</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">SKU</label>
              <input className="input" value={form.SKU} onChange={(e) => setForm({ ...form, SKU: e.target.value })} required disabled={!!product?.id} />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Категория</label>
              <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                <option value="">Выберите...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Себестоимость (сом)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Цена продажи (сом)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Размер</label>
              <input className="input" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="92, 98, 104..." />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Цвет</label>
              <input className="input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Синий, Красный..." />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
            <button type="submit" disabled={isLoading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
