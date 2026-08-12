'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DashboardMetrics, Expense } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Plus,
  Trash2,
  Loader2,
  X,
  ArrowUpRight,
  FileDown,
} from 'lucide-react';
import { exportToExcel } from '@/lib/exportToExcel';

import Link from 'next/link';

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  format = 'currency',
  href,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  format?: 'currency' | 'number';
  href?: string;
}) {
  const formatted =
    format === 'currency'
      ? `${value.toLocaleString('ru-KG')} с.`
      : value.toLocaleString('ru-KG');

  const CardContent = (
    <div className="card group hover:border-accent/50 transition-all duration-200 h-full relative cursor-pointer">
      <div className={`inline-flex p-3 rounded-xl mb-4 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      {href && (
        <ArrowUpRight className="w-4 h-4 text-muted absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      <p className="text-2xl font-bold text-text-primary">{formatted}</p>
      <p className="text-sm text-muted mt-1">{title}</p>
    </div>
  );

  return href ? <Link href={href} className="block">{CardContent}</Link> : CardContent;
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.set('startDate', dateRange.start);
      if (dateRange.end) params.set('endDate', dateRange.end);

      const [metricsRes] = await Promise.all([
        api.get<DashboardMetrics>(`/analytics/dashboard?${params}`),
      ]);
      setMetrics(metricsRes.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [dateRange]);

  const handleExportSales = async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.set('startDate', dateRange.start);
      if (dateRange.end) params.set('endDate', dateRange.end);
      
      const { data } = await api.get(`/analytics/reports/sales?${params}`);
      const exportData = data.map((sale: any) => ({
        'ID Продажи': sale.id,
        'Дата': new Date(sale.createdAt).toLocaleDateString('ru-KG'),
        'Время': new Date(sale.createdAt).toLocaleTimeString('ru-KG'),
        'Кассир': sale.cashier?.email || 'Неизвестно',
        'Метод оплаты': sale.paymentMethod === 'CASH' ? 'Наличные' : sale.paymentMethod === 'CARD' ? 'Карта' : sale.paymentMethod === 'QR' ? 'QR' : 'В долг',
        'Выручка': sale.totalAmount,
        'Прибыль': sale.totalProfit,
      }));
      exportToExcel(exportData, 'История_продаж_Jannat', 'Продажи');
    } catch (err) {
      console.error(err);
      alert('Ошибка при экспорте продаж');
    }
  };

  return (
    <AuthGuard allowedRoles={['OWNER']}>
      <div className="space-y-8 animate-slide-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-accent" /> Аналитика
            </h1>
            <button 
              onClick={handleExportSales}
              className="btn-secondary flex items-center gap-2 py-1.5 px-3 text-sm"
            >
              <FileDown className="w-4 h-4 text-green-400" />
              Экспорт продаж
            </button>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="input w-36 text-sm"
              value={dateRange.start}
              onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))}
            />
            <span className="text-muted text-sm">—</span>
            <input
              type="date"
              className="input w-36 text-sm"
              value={dateRange.end}
              onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))}
            />
            {(dateRange.start || dateRange.end) && (
              <button
                onClick={() => setDateRange({ start: '', end: '' })}
                className="text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : metrics ? (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              <MetricCard
                title="Выручка"
                value={metrics.revenue}
                icon={DollarSign}
                color="bg-blue-500/20 text-blue-400"
                href="/analytics/reports/sales"
              />
              <MetricCard
                title="Валовая прибыль"
                value={metrics.grossProfit}
                icon={TrendingUp}
                color="bg-green-500/20 text-green-400"
                href="/analytics/reports/sales"
              />
              <MetricCard
                title="Расходы"
                value={metrics.expenses}
                icon={TrendingDown}
                color="bg-red-500/20 text-red-400"
                href="/analytics/reports/expenses"
              />
              <MetricCard
                title="Чистая прибыль"
                value={metrics.netProfit}
                icon={BarChart3}
                color={metrics.netProfit >= 0 ? 'bg-purple-500/20 text-purple-400' : 'bg-red-500/20 text-red-400'}
                href="/analytics/reports/sales"
              />
              <MetricCard
                title="Кол-во продаж"
                value={metrics.salesCount}
                icon={ShoppingCart}
                color="bg-cyan-500/20 text-cyan-400"
                format="number"
                href="/analytics/reports/sales"
              />
              <MetricCard
                title="Стоимость склада"
                value={metrics.totalStockValue}
                icon={Package}
                color="bg-orange-500/20 text-orange-400"
                href="/analytics/reports/stock"
              />
            </div>

            {/* Profit margin indicator */}
            {metrics.revenue > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">Показатели эффективности</h2>
                <div className="grid grid-cols-3 gap-6">
                  {[
                    {
                      label: 'Маржа валовой прибыли',
                      value: ((metrics.grossProfit / metrics.revenue) * 100).toFixed(1) + '%',
                      color: 'text-green-400',
                    },
                    {
                      label: 'Маржа чистой прибыли',
                      value: ((metrics.netProfit / metrics.revenue) * 100).toFixed(1) + '%',
                      color: metrics.netProfit >= 0 ? 'text-purple-400' : 'text-red-400',
                    },
                    {
                      label: 'Средний чек',
                      value: metrics.salesCount > 0
                        ? `${Math.round(metrics.revenue / metrics.salesCount).toLocaleString('ru-KG')} с.`
                        : '0 с.',
                      color: 'text-cyan-400',
                    },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                      <p className="text-sm text-muted mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Products */}
            {metrics.topProducts?.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">Топ-10 товаров по продажам</h2>
                <div className="space-y-2">
                  {metrics.topProducts.map((tp, i) => (
                    <div key={tp.productId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2">
                      <span className="w-6 text-center text-sm font-bold text-muted">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{tp.product?.name || `Товар #${tp.productId}`}</p>
                          <p className="text-sm text-muted">{tp._sum.quantity ?? 0} шт.</p>
                        </div>
                        <div className="w-full bg-surface-2 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-accent h-1.5 rounded-full"
                            style={{
                              width: `${Math.round(((tp._sum.quantity ?? 0) / (metrics.topProducts[0]._sum.quantity ?? 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </AuthGuard>
  );
}
