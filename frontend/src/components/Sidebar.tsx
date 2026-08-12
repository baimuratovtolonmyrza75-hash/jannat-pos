'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  ClipboardList,
  BarChart3,
  Users,
  LogOut,
  ShoppingBag,
  ChevronRight,
  ClipboardSignature,
  WalletCards
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Главная',
    icon: LayoutDashboard,
    roles: ['OWNER', 'ADMIN'],
  },
  {
    href: '/pos',
    label: 'Касса',
    icon: ShoppingCart,
    roles: ['OWNER', 'ADMIN', 'CASHIER'],
  },
  {
    href: '/products',
    label: 'Товары',
    icon: Package,
    roles: ['OWNER', 'ADMIN'],
  },
  {
    href: '/debts',
    label: 'Долги',
    icon: ClipboardSignature,
    roles: ['OWNER', 'ADMIN', 'CASHIER'],
  },
  {
    href: '/inventory',
    label: 'Склад',
    icon: Warehouse,
    roles: ['OWNER', 'ADMIN'],
  },
  {
    href: '/audit',
    label: 'Ревизия',
    icon: ClipboardList,
    roles: ['OWNER', 'ADMIN'],
  },
  {
    href: '/expenses',
    label: 'Расходы',
    icon: WalletCards,
    roles: ['OWNER', 'ADMIN'],
  },
  {
    href: '/analytics',
    label: 'Аналитика',
    icon: BarChart3,
    roles: ['OWNER'],
  },
  {
    href: '/users',
    label: 'Команда',
    icon: Users,
    roles: ['OWNER'],
  },
];

export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Владелец',
  ADMIN: 'Админ',
  CASHIER: 'Кассир',
};

export const ROLE_COLORS: Record<string, string> = {
  OWNER: 'badge-purple',
  ADMIN: 'badge-info',
  CASHIER: 'badge-success',
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const filteredItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user.role),
  );

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-surface border-r border-subtle flex-col z-50">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent/20 rounded-xl flex items-center justify-center border border-accent/30">
            <ShoppingBag className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="font-bold text-text-primary leading-tight">Jannat POS</p>
            <p className="text-xs text-muted">ERP Lite</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                ${isActive
                  ? 'bg-accent/15 text-accent border border-accent/20'
                  : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
                }
              `}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-accent' : ''}`} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 text-accent" />}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-subtle px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-surface-2 rounded-full flex items-center justify-center border border-subtle text-sm font-bold text-text-secondary flex-shrink-0">
            {user.email[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{user.email}</p>
            <span className={ROLE_COLORS[user.role] || 'badge'}>
              {ROLE_LABELS[user.role] || user.role}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors duration-150"
        >
          <LogOut className="w-4 h-4" />
          Выйти
        </button>
      </div>
    </aside>
  );
}
