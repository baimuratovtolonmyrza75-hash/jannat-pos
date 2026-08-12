'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Product, StockMovement } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import {
  ArrowLeft,
  Package,
  TrendingUp,
  History,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prodRes, movRes] = await Promise.all([
          api.get<Product>(`/products/${id}`),
          api.get<StockMovement[]>(`/products/${id}/movements`),
        ]);
        setProduct(prodRes.data);
        setMovements(movRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) loadData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-muted">Товар не найден</p>
        <button onClick={() => router.back()} className="btn-secondary mt-4">
          Назад
        </button>
      </div>
    );
  }

  const margin = product.costPrice > 0
    ? Math.round(((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100)
    : 0;

  const totalSold = movements
    .filter(m => m.type === 'SALE')
    .reduce((sum, m) => sum + Math.abs(m.quantity), 0);

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'RECEIVE': return <ArrowDownRight className="w-5 h-5 text-green-400" />;
      case 'SALE': return <ArrowUpRight className="w-5 h-5 text-blue-400" />;
      case 'AUDIT_ADJUSTMENT': return <Activity className="w-5 h-5 text-orange-400" />;
      case 'RETURN': return <ArrowDownRight className="w-5 h-5 text-purple-400" />;
      default: return <History className="w-5 h-5 text-muted" />;
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'RECEIVE': return 'Приемка';
      case 'SALE': return 'Продажа';
      case 'AUDIT_ADJUSTMENT': return 'Ревизия';
      case 'RETURN': return 'Возврат';
      default: return type;
    }
  };

  return (
    <AuthGuard allowedRoles={['OWNER', 'ADMIN']}>
      <div className="space-y-6 animate-slide-in">
        <button
          onClick={() => router.push('/products')}
          className="flex items-center gap-2 text-muted hover:text-text-primary transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Назад к списку
        </button>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Package className="w-8 h-8 text-accent" /> {product.name}
            </h1>
            <p className="text-muted mt-1">SKU: {product.SKU} • {product.category?.name}</p>
          </div>
          <span className={`badge text-base px-3 py-1 ${product.stock === 0 ? 'badge-danger' : product.stock <= 5 ? 'badge-warning' : 'badge-success'}`}>
            В наличии: {product.stock} шт.
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-muted mb-1">Цена продажи</p>
            <p className="text-2xl font-bold text-text-primary">{product.sellingPrice.toLocaleString('ru-KG')} с.</p>
          </div>
          <div className="card">
            <p className="text-sm text-muted mb-1">Себестоимость</p>
            <p className="text-2xl font-bold text-text-primary">{product.costPrice.toLocaleString('ru-KG')} с.</p>
          </div>
          <div className="card">
            <p className="text-sm text-muted mb-1 flex items-center gap-1">
              Маржинальность <TrendingUp className="w-3 h-3" />
            </p>
            <p className={`text-2xl font-bold ${margin >= 30 ? 'text-green-400' : margin >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
              {margin}%
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-muted mb-1">Всего продано</p>
            <p className="text-2xl font-bold text-cyan-400">{totalSold} шт.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Информация</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-subtle pb-2">
                  <span className="text-muted">Баркод</span>
                  <span className="font-mono">{product.barcode || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-subtle pb-2">
                  <span className="text-muted">Размер</span>
                  <span>{product.size || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-subtle pb-2">
                  <span className="text-muted">Цвет</span>
                  <span>{product.color || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-subtle pb-2">
                  <span className="text-muted">Добавлен</span>
                  <span>{new Date(product.createdAt).toLocaleDateString('ru-KG')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Обновлен</span>
                  <span>{new Date(product.updatedAt).toLocaleDateString('ru-KG')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="card h-full">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-accent" />
                История движения товара
              </h2>
              
              {movements.length === 0 ? (
                <p className="text-center text-muted py-8">История пуста</p>
              ) : (
                <div className="relative border-l-2 border-subtle ml-4 space-y-6 pb-4">
                  {movements.map((mov) => (
                    <div key={mov.id} className="relative pl-6 group">
                      <div className="absolute -left-[11px] bg-surface-1 border-2 border-surface-2 rounded-full p-1 group-hover:border-accent transition-colors">
                        {getMovementIcon(mov.type)}
                      </div>
                      <div className="bg-surface-2 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-text-primary">
                            {getMovementLabel(mov.type)}
                          </p>
                          <span className={`font-bold ${mov.quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {mov.quantity > 0 ? '+' : ''}{mov.quantity} шт.
                          </span>
                        </div>
                        <p className="text-xs text-muted flex justify-between">
                          <span>{mov.createdBy?.email}</span>
                          <span>{new Date(mov.createdAt).toLocaleString('ru-KG')}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
