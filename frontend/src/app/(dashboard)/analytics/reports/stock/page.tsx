'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { Loader2, ArrowLeft, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface StockProduct {
  id: number;
  name: string;
  SKU: string;
  stock: number;
  costPrice: number;
  sellingPrice: number;
  totalValue: number;
}

export default function StockReportPage() {
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const { data } = await api.get<StockProduct[]>('/analytics/reports/stock');
      setProducts(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const totalStockValue = products.reduce((acc, p) => acc + p.totalValue, 0);

  return (
    <AuthGuard allowedRoles={['OWNER']}>
      <div className="space-y-6 animate-slide-in">
        <div className="flex items-center gap-4">
          <Link href="/analytics" className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-2 text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold flex-1">Отчет по стоимости склада</h1>
        </div>

        <div className="card bg-orange-500/10 border-orange-500/20 max-w-sm">
          <p className="text-sm text-orange-400">Общая стоимость склада (в закупке)</p>
          <p className="text-3xl font-bold text-orange-400 mt-1">{totalStockValue.toLocaleString('ru-KG')} с.</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="font-semibold">Товары с наибольшей долей в складе</h2>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
          ) : products.length === 0 ? (
            <p className="text-center text-muted py-8">Склад пуст</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-subtle text-left text-muted">
                    <th className="pb-3 px-4 font-medium">Товар</th>
                    <th className="pb-3 px-4 font-medium">Остаток</th>
                    <th className="pb-3 px-4 font-medium">Закупка (за шт.)</th>
                    <th className="pb-3 px-4 font-medium text-right">Общая сумма</th>
                    <th className="pb-3 px-4 font-medium text-right">Доля в складе</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {products.map((p) => {
                    const percentage = totalStockValue > 0 ? (p.totalValue / totalStockValue) * 100 : 0;
                    return (
                      <tr key={p.id} className="hover:bg-surface-2 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-medium text-text-primary">{p.name}</p>
                          <p className="text-xs text-muted">SKU: {p.SKU}</p>
                        </td>
                        <td className="py-3 px-4 font-medium">{p.stock} шт.</td>
                        <td className="py-3 px-4 text-muted">{p.costPrice.toLocaleString('ru-KG')} с.</td>
                        <td className="py-3 px-4 text-right font-medium text-orange-400">{p.totalValue.toLocaleString('ru-KG')} с.</td>
                        <td className="py-3 px-4 text-right w-32">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-muted">{percentage.toFixed(1)}%</span>
                            <div className="w-16 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(percentage, 100)}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
