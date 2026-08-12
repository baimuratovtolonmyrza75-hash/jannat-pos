'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { NAV_ITEMS } from './Sidebar';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

import { ROLE_COLORS, ROLE_LABELS } from './Sidebar';

export function BottomNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  if (!user) return null;

  const filteredItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user.role),
  );

  // Take the first 4 items for the main bottom bar, the rest go to "More"
  const visibleItems = filteredItems.slice(0, 4);
  const overflowItems = filteredItems.slice(4);

  return (
    <>
      {/* Overflow Menu Modal */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden flex flex-col justify-end pb-20">
          <div className="bg-surface border-t border-subtle p-4 rounded-t-2xl animate-slide-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Меню</h3>
              <button onClick={() => setIsMoreMenuOpen(false)} className="p-2 text-muted hover:text-text-primary">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {overflowItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMoreMenuOpen(false)}
                    className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-colors ${
                      isActive ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-surface-2'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-medium text-center leading-tight">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Nav Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface/80 backdrop-blur-md border-t border-subtle pb-safe z-50">
        <div className="flex items-center justify-around px-2 py-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMoreMenuOpen(false)}
                className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-accent bg-accent/10 scale-105'
                    : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
                }`}
              >
                <Icon className={`w-6 h-6 mb-1 ${isActive ? 'fill-accent/20' : ''}`} />
                <span className="text-[10px] font-semibold tracking-wide">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          {overflowItems.length > 0 && (
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200 ${
                isMoreMenuOpen
                  ? 'text-accent bg-accent/10 scale-105'
                  : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
              }`}
            >
              <Menu className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-semibold tracking-wide">Ещё</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
