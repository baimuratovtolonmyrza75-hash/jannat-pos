'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { ShoppingBag, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, ROLE_LABELS, ROLE_COLORS } from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect, useRef } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const currentNav = NAV_ITEMS.find(item => pathname === item.href || pathname.startsWith(item.href + '/'));

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        
        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen pb-20 lg:pb-0">
          {/* Mobile Header */}
          <header className="lg:hidden flex items-center justify-between p-4 bg-surface/80 backdrop-blur-md border-b border-subtle sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-accent/20 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-accent" />
              </div>
              <span className="font-bold text-text-primary text-lg">
                {currentNav ? currentNav.label : 'Jannat POS'}
              </span>
            </div>
            
            {/* Profile icon - top right */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(prev => !prev)}
                className="w-9 h-9 bg-accent/20 rounded-full flex items-center justify-center font-bold text-accent border border-accent/20 active:scale-95 transition-transform"
              >
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </button>
              
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-surface border border-subtle rounded-xl shadow-2xl z-50">
                  <div className="p-4 border-b border-subtle">
                    <p className="text-sm font-medium text-text-primary truncate">{user?.email}</p>
                    <span className={`${user?.role ? ROLE_COLORS[user.role] : 'badge'} text-[10px] mt-1.5 inline-block`}>
                      {user?.role ? ROLE_LABELS[user.role] : ''}
                    </span>
                  </div>
                  <button
                    onClick={() => { setIsProfileOpen(false); logout(); }}
                    className="w-full flex items-center gap-2 p-4 text-sm text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors rounded-b-xl"
                  >
                    <LogOut className="w-4 h-4" />
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8 overflow-auto">
            {children}
          </main>
        </div>
        
        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
