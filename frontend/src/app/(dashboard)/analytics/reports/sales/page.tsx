'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { Loader2, ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';

interface SaleItem {
  id: number;
  quantity: number;
  priceAtSale: number;
  costPriceAtSale: number;
  product: { name: string; SKU: string };
}

interface Sale {
  id: number;
  totalAmount: number;
  totalProfit: number;
  paymentMethod: string;
  createdAt: string;
  cashier: { id: number; email: string };
  saleItems: SaleItem[];
}

export default function SalesReportPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.set('startDate', dateRange.start);
      if (dateRange.end) params.set('endDate', dateRange.end);

      const { data } = await api.get<Sale[]>(`/analytics/reports/sales?${params}`);
      setSales(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [dateRange]);

  const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalProfit = sales.reduce((acc, s) => acc + s.totalProfit, 0);

  return (
    <AuthGuard allowedRoles={['OWNER']}>
      <div className="space-y-6 animate-slide-in">
        <div className="flex items-center gap-4">
          <Link href="/analytics" className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-2 text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold flex-1">Отчет по продажам</h1>
          
          <div className="flex items-center gap-2">
            <input type="date" className="input text-sm w-36" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} />
            <span className="text-muted">—</span>
            <input type="date" className="input text-sm w-36" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card bg-blue-500/10 border-blue-500/20">
            <p className="text-sm text-blue-400">Общая выручка</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{totalRevenue.toLocaleString('ru-KG')} с.</p>
          </div>
          <div className="card bg-green-500/10 border-green-500/20">
            <p className="text-sm text-green-400">Общая прибыль</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{totalProfit.toLocaleString('ru-KG')} с.</p>
          </div>
          <div className="card bg-cyan-500/10 border-cyan-500/20">
            <p className="text-sm text-cyan-400">Кол-во продаж</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">{sales.length}</p>
          </div>
        </div>

        <div className="card">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
          ) : sales.length === 0 ? (
            <p className="text-center text-muted py-8">Продаж не найдено</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-subtle text-left text-muted">
                    <th className="pb-3 px-4 font-medium">Чек #</th>
                    <th className="pb-3 px-4 font-medium">Дата</th>
                    <th className="pb-3 px-4 font-medium">Кассир</th>
                    <th className="pb-3 px-4 font-medium">Товары</th>
                    <th className="pb-3 px-4 font-medium text-right">Выручка</th>
                    <th className="pb-3 px-4 font-medium text-right">Прибыль</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-surface-2 transition-colors">
                      <td className="py-3 px-4 font-medium text-muted">#{sale.id}</td>
                      <td className="py-3 px-4">{new Date(sale.createdAt).toLocaleString('ru-KG')}</td>
                      <td className="py-3 px-4">{sale.cashier?.email.split('@')[0]}</td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {sale.saleItems.map((item) => (
                            <div key={item.id} className="text-xs text-muted flex justify-between gap-4">
                              <span>{item.product.name} (x{item.quantity})</span>
                              <span>{(item.quantity * item.priceAtSale).toLocaleString('ru-KG')} с.</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{sale.totalAmount.toLocaleString('ru-KG')} с.</td>
                      <td className="py-3 px-4 text-right text-green-400 font-medium">+{sale.totalProfit.toLocaleString('ru-KG')} с.</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
