import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Home, Users, PlusCircle, History, Settings, 
  WifiOff, ArrowUpRight, TrendingUp, CreditCard 
} from 'lucide-react';
import { useStore } from '../../lib/store';

export const AppLayout: React.FC = () => {
  const { t } = useTranslation();
  const { isOffline, business } = useStore();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 font-medium text-xs md:text-sm text-center flex items-center justify-center gap-2 fixed top-0 left-0 right-0 z-50 shadow-md">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>{t('common.no_internet')}</span>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-screen sticky top-0 p-5 justify-between">
        <div className="space-y-6">
          {/* Logo & Business */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
              OD
            </div>
            <div className="overflow-hidden">
              <h1 className="font-extrabold text-base tracking-tight leading-none text-slate-900 dark:text-white">
                Optom Daftar
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                {business.name}
              </p>
            </div>
          </div>

          {/* Quick Action Button */}
          <NavLink
            to="/sales/new"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-5 h-5" />
            <span>+ Yangi savdo</span>
          </NavLink>

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-2">
            <NavLink
              to="/"
              className={({ isActive }) => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                isActive 
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>{t('nav.home')}</span>
            </NavLink>

            <NavLink
              to="/clients"
              className={({ isActive }) => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                isActive 
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>{t('nav.clients')}</span>
            </NavLink>

            <NavLink
              to="/payments/new"
              className={({ isActive }) => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                isActive 
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <CreditCard className="w-5 h-5 text-emerald-500" />
              <span>+ To'lov olish</span>
            </NavLink>

            <NavLink
              to="/history"
              className={({ isActive }) => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                isActive 
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <History className="w-5 h-5" />
              <span>{t('nav.history')}</span>
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                isActive 
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>{t('nav.settings')}</span>
            </NavLink>
          </nav>
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-400">
          <p className="font-semibold text-slate-700 dark:text-slate-300">Optom Daftar v1.0</p>
          <p className="mt-0.5">Ulgurji nasiya tizimi</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 pb-24 md:pb-8 flex flex-col">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 z-40 px-2 py-1.5 safe-bottom">
        <div className="flex items-center justify-around relative">
          <NavLink
            to="/"
            className={({ isActive }) => `flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
              isActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span>{t('nav.home')}</span>
          </NavLink>

          <NavLink
            to="/clients"
            className={({ isActive }) => `flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
              isActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>{t('nav.clients')}</span>
          </NavLink>

          {/* Large Center "+ Savdo" button */}
          <NavLink
            to="/sales/new"
            aria-label="Yangi savdo"
            className="flex flex-col items-center justify-center -mt-6 group"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-active:scale-95 transition-transform border-4 border-white dark:border-slate-900">
              <PlusCircle className="w-7 h-7" />
            </div>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              + Savdo
            </span>
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) => `flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
              isActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <History className="w-5 h-5 mb-0.5" />
            <span>{t('nav.history')}</span>
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) => `flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
              isActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Settings className="w-5 h-5 mb-0.5" />
            <span>{t('nav.settings')}</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
};
