import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Home, Users, PlusCircle, History, Settings, 
  WifiOff, ArrowUpRight, TrendingUp, CreditCard, LogOut,
  Building2
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { useAuth } from '../../lib/auth';

export const AppLayout: React.FC = () => {
  const { t } = useTranslation();
  const { isOffline, business } = useStore();
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 font-bold text-xs text-center flex items-center justify-center gap-2 fixed top-0 left-0 right-0 z-50 shadow-md">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>{t('common.no_internet')}</span>
        </div>
      )}

      {/* Mobile Top Header (compact & clean) */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 flex items-center justify-between safe-top">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-blue-500/25">
            XK
          </div>
          <div className="overflow-hidden">
            <h1 className="font-extrabold text-sm tracking-tight leading-none text-slate-900 dark:text-white">
              Xisob Kitob
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {business.name}
            </p>
          </div>
        </div>

        {/* Quick action or profile */}
        <div className="flex items-center gap-1.5">
          <NavLink
            to="/payments/new"
            aria-label="To'lov olish"
            className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1 touch-target justify-center"
          >
            <CreditCard className="w-4 h-4" />
            <span className="text-[11px] hidden xs:inline">+ To'lov</span>
          </NavLink>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-screen sticky top-0 p-5 justify-between">
        <div className="space-y-6">
          {/* Logo & Business */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
              XK
            </div>
            <div className="overflow-hidden">
              <h1 className="font-extrabold text-base tracking-tight leading-none text-slate-900 dark:text-white">
                Xisob Kitob
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
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-bold' 
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
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-bold' 
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
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 font-bold' 
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
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-bold' 
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
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-bold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>{t('nav.settings')}</span>
            </NavLink>
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          {user && (
            <div className="flex items-center justify-between">
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {user.full_name || user.email}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user.email}
                </p>
              </div>

              <button
                onClick={() => signOut()}
                title="Chiqish"
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="text-[11px] text-slate-400">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Xisob Kitob v1.0</p>
            <p className="mt-0.5">Ulgurji xavfsiz nasiya tizimi</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area (Optimized for 360px phones without horizontal overflow) */}
      <main className="flex-1 min-w-0 pb-28 md:pb-8 flex flex-col overflow-x-hidden">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar (Ergonomic thumb zone) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 z-40 px-3 py-1 safe-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around relative">
          <NavLink
            to="/"
            className={({ isActive }) => `flex flex-col items-center justify-center py-1.5 px-3 rounded-xl touch-target text-[10px] font-bold transition-all ${
              isActive ? 'text-blue-600 dark:text-blue-400 scale-105' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span>{t('nav.home')}</span>
          </NavLink>

          <NavLink
            to="/clients"
            className={({ isActive }) => `flex flex-col items-center justify-center py-1.5 px-3 rounded-xl touch-target text-[10px] font-bold transition-all ${
              isActive ? 'text-blue-600 dark:text-blue-400 scale-105' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>{t('nav.clients')}</span>
          </NavLink>

          {/* Large Center "+ Savdo" Thumb Button (56px) */}
          <NavLink
            to="/sales/new"
            aria-label="Yangi savdo"
            className="flex flex-col items-center justify-center -mt-7 group"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xl shadow-blue-600/35 group-active:scale-90 transition-transform border-[3px] border-white dark:border-slate-950">
              <PlusCircle className="w-7 h-7" />
            </div>
            <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
              + Savdo
            </span>
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) => `flex flex-col items-center justify-center py-1.5 px-3 rounded-xl touch-target text-[10px] font-bold transition-all ${
              isActive ? 'text-blue-600 dark:text-blue-400 scale-105' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <History className="w-5 h-5 mb-0.5" />
            <span>{t('nav.history')}</span>
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) => `flex flex-col items-center justify-center py-1.5 px-3 rounded-xl touch-target text-[10px] font-bold transition-all ${
              isActive ? 'text-blue-600 dark:text-blue-400 scale-105' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
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
