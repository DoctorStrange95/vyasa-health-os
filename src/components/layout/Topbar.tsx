import { Bell, Search, RefreshCw, Wifi, WifiOff, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TopbarProps {
  title?: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { user, isDemo } = useAuthStore();
  const { alerts, toggleMobileSidebar } = useAppStore();
  const [search, setSearch] = useState('');

  const unack = alerts.filter(a => !a.acknowledged).length;
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <header className="h-14 md:h-16 bg-white border-b border-slate-200 flex items-center gap-3 px-3 md:px-5 flex-shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={toggleMobileSidebar}
        className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 flex-shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search / title */}
      <div className="flex-1 min-w-0">
        {title ? (
          <div>
            <div className="text-base font-bold text-slate-900 leading-tight">{title}</div>
            {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
          </div>
        ) : (
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search patients…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
            />
          </div>
        )}
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Demo badge */}
        {isDemo && (
          <span className="hidden sm:flex badge bg-amber-100 text-amber-700 gap-1 text-xs">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            Demo
          </span>
        )}

        {/* Date/time — desktop only */}
        <div className="hidden lg:flex flex-col items-end leading-tight">
          <span className="text-xs font-semibold text-slate-700">{now}</span>
          <span className="text-[10px] text-slate-400">{date}</span>
        </div>

        {/* Refresh — desktop only */}
        {!isDemo && (
          <button className="hidden md:block p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Connection indicator */}
        <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
          {isDemo ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5 text-emerald-500" />}
        </div>

        {/* Alerts bell */}
        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
          <Bell className="w-5 h-5" />
          {unack > 0 && (
            <span className={cn(
              'absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5',
              'animate-pulse'
            )}>
              {unack > 9 ? '9+' : unack}
            </span>
          )}
        </button>

        {/* Avatar + name */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden md:block">
            <div className="text-sm font-semibold text-slate-800 leading-tight">{user?.name}</div>
            <div className="text-[11px] text-slate-400 capitalize">
              {user?.role === 'clinic_admin' ? 'Solo Practice' : user?.role}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
