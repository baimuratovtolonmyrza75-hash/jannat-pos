'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { DashboardMetrics } from '@/lib/types';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  DollarSign,
  BarChart2,
  Loader2,
  ArrowUpRight,
} from 'lucide-react';

import Link from 'next/link';

function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  format = 'currency',
  href,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  color: string;
  format?: 'currency' | 'number';
  href?: string;
}) {
  const formatted =
    format === 'currency'
      ? `${value.toLocaleString('ru-KG')} сом`
      : value.toLocaleString('ru-KG');

  const CardContent = (
    <div className="card group hover:border-accent/50 transition-all duration-200 h-full relative cursor-pointer">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend !== undefined && (
          <span
            className={`flex items-center gap-1 text-xs font-medium ${
              trend >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {trend >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(trend)}%
          </span>
        )}
        {href && (
          <ArrowUpRight className="w-4 h-4 text-muted absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-text-primary">{formatted}</p>
        <p className="text-sm text-muted mt-1">{title}</p>
      </div>
    </div>
  );

  return href ? <Link href={href} className="block">{CardContent}</Link> : CardContent;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        if (user?.role === 'OWNER') {
          const { data } = await api.get<DashboardMetrics>('/analytics/dashboard');
          setMetrics(data);
        } else {
          // Non-owners get a simpler view
          const { data: lowStock } = await api.get('/inventory/low-stock?threshold=10');
          setMetrics({ lowStock } as unknown as DashboardMetrics);
        }
      } catch {
        setError('Не удалось загрузить данные');
      } finally {
        setIsLoading(false);
      }
    };

    loadMetrics();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  return (
    <div className="space-y-8 animate-slide-in">
      {/* Header */}
      <div className="bg-surface-2 p-4 rounded-2xl border border-subtle">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
          {greeting()}, {user?.email.split('@')[0]}! 👋
        </h1>
        <p className="text-muted mt-1">
          {new Date().toLocaleDateString('ru-KG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Quick Overview (Owner only) */}
      {user?.role === 'OWNER' && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Выручка"
            value={metrics.revenue}
            icon={DollarSign}
            color="bg-blue-500/20 text-blue-400"
          />
          <MetricCard
            title="Продажи (шт)"
            value={metrics.salesCount}
            icon={ShoppingCart}
            format="number"
            color="bg-cyan-500/20 text-cyan-400"
          />
          <div className="card flex flex-col justify-center gap-2 hover:border-accent/50 transition-colors cursor-pointer" onClick={() => window.location.href = '/analytics'}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-lg text-text-primary">Полная аналитика</p>
                <p className="text-sm text-muted">Прибыль, маржа, графики</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions (All roles) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Касса (POS)', desc: 'Продажа товаров', href: '/pos', icon: ShoppingCart, roles: ['OWNER', 'ADMIN', 'CASHIER'] },
          { label: 'Товары', desc: 'Справочник и цены', href: '/products', icon: Package, roles: ['OWNER', 'ADMIN'] },
          { label: 'Склад', desc: 'Приемка товара', href: '/inventory', icon: TrendingUp, roles: ['OWNER', 'ADMIN'] },
          { label: 'Долги', desc: 'Управление должниками', href: '/debts', icon: DollarSign, roles: ['OWNER', 'ADMIN', 'CASHIER'] },
        ]
        .filter(action => action.roles.includes(user?.role || ''))
        .map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="card group hover:bg-surface-2 transition-colors flex items-center gap-4"
            >
              <div className="p-3 bg-surface-2 group-hover:bg-accent/20 text-muted group-hover:text-accent rounded-xl transition-colors">
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-text-primary">{action.label}</p>
                <p className="text-xs text-muted mt-0.5">{action.desc}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors opacity-0 group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>

    </div>
  );
}
