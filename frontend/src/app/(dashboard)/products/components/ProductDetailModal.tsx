'use client';

import { Product } from '@/lib/types';
import { X, Search, Pencil } from 'lucide-react';

export default function ProductDetailModal({
  product,
  onClose,
  onEdit,
}: {
  product: Product;
  onClose: () => void;
  onEdit: () => void;
}) {
  const margin = product.costPrice > 0
    ? Math.round(((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm animate-slide-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Карточка товара</h2>
          <button onClick={onClose} className="text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-lg font-semibold text-text-primary">{product.name}</p>
            <p className="text-sm text-muted">{product.category?.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: 'SKU', value: product.SKU },
              { label: 'Баркод', value: product.barcode || '—' },
              { label: 'Размер', value: product.size || '—' },
              { label: 'Цвет', value: product.color || '—' },
              { label: 'Себест.', value: `${product.costPrice.toLocaleString('ru-KG')} с.` },
              { label: 'Цена', value: `${product.sellingPrice.toLocaleString('ru-KG')} с.` },
              { label: 'Маржа', value: `${margin}%` },
              { label: 'Остаток', value: `${product.stock} шт.` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface-2 rounded-lg p-2">
                <p className="text-xs text-muted">{label}</p>
                <p className="font-medium text-text-primary">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Закрыть</button>
            <a href={`/products/${product.id}`} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <Search className="w-4 h-4" />
              Подробнее
            </a>
            <button onClick={onEdit} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Pencil className="w-4 h-4" />
              Изменить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
