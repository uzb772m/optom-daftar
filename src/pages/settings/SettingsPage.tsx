import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Building2, Globe, Moon, Sun, Plus, 
  RotateCcw, Check, ShoppingBag, Trash2, LogOut 
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { useAuth } from '../../lib/auth';
import { changeAppLanguage } from '../../i18n';
import { formatMoney, parseMoney, formatNumberWithSpaces } from '../../lib/money';

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { business, products, updateBusinessInfo, addProduct, resetToDemoData } = useStore();
  const { user, signOut } = useAuth();

  const [bizName, setBizName] = useState(business.name);
  const [bizPhone, setBizPhone] = useState(business.phone || '');
  const [bizAddress, setBizAddress] = useState(business.address || '');
  const [isSaved, setIsSaved] = useState(false);

  // Theme state
  const isDark = document.documentElement.classList.contains('dark');
  const [darkMode, setDarkMode] = useState(isDark);

  // New product state
  const [newProdName, setNewProdName] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('dona');
  const [newProdPrice, setNewProdPrice] = useState('');

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusinessInfo({
      name: bizName,
      phone: bizPhone,
      address: bizAddress
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleLanguageChange = (lang: 'uz' | 'ru') => {
    changeAppLanguage(lang);
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('optom_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('optom_theme', 'light');
    }
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;
    addProduct(newProdName.trim(), newProdUnit, parseMoney(newProdPrice));
    setNewProdName('');
    setNewProdPrice('');
  };

  const handleResetDemo = () => {
    if (confirm("Haqiqatan ham barcha ma'lumotlarni demo holatiga qaytarmoqchimisiz?")) {
      resetToDemoData();
      alert("Demo ma'lumotlar tiklandi!");
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-5 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t('settings.title')}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Tizim parametrlari va tovarlar katalogi
        </p>
      </div>

      {/* Business Profile */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>{t('settings.business_profile')}</span>
        </h2>

        <form onSubmit={handleSaveBusiness} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {t('settings.business_name')}
            </label>
            <input
              type="text"
              required
              value={bizName}
              onChange={(e) => setBizName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('common.phone')}
              </label>
              <input
                type="text"
                value={bizPhone}
                onChange={(e) => setBizPhone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-tabular focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Manzil / Bozor
              </label>
              <input
                type="text"
                value={bizAddress}
                onChange={(e) => setBizAddress(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20"
            >
              {isSaved ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{isSaved ? "Saqlandi!" : t('common.save')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Language & Theme */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-600" />
          <span>{t('settings.language')} & {t('settings.theme')}</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Language Switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
              Tilni tanlang
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleLanguageChange('uz')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                  i18n.language === 'uz'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                O'zbekcha
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('ru')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                  i18n.language === 'ru'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                Русский
              </button>
            </div>
          </div>

          {/* Theme Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
              {t('settings.theme')}
            </label>
            <button
              type="button"
              onClick={toggleDarkMode}
              className="w-full py-2 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                {darkMode ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                <span>{darkMode ? t('settings.theme_dark') : t('settings.theme_light')}</span>
              </span>
              <span className="text-[11px] text-slate-400 underline">O'zgartirish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Product Catalog Management */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-indigo-600" />
          <span>{t('settings.products_catalog')}</span>
        </h2>

        {/* Add Product Form */}
        <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="sm:col-span-5">
            <input
              type="text"
              required
              value={newProdName}
              onChange={(e) => setNewProdName(e.target.value)}
              placeholder="Tovar nomi (masalan: Un 1-nav)"
              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={newProdUnit}
              onChange={(e) => setNewProdUnit(e.target.value)}
              className="w-full px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
            >
              {['dona', 'kg', 'tonna', 'qop', 'quti', 'pachka', 'blok', 'litr', 'metr'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <input
              type="text"
              inputMode="numeric"
              value={formatNumberWithSpaces(newProdPrice)}
              onChange={(e) => setNewProdPrice(e.target.value)}
              placeholder="Standart narx"
              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-tabular focus:outline-none"
            />
          </div>

          <div className="sm:col-span-1">
            <button
              type="submit"
              className="w-full h-full py-1.5 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Product List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto pr-1">
          {products.map(p => (
            <div key={p.id} className="py-2 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                <span className="text-[11px] text-slate-400 ml-2 font-tabular">({p.unit})</span>
              </div>
              <span className="font-bold font-tabular text-slate-900 dark:text-white">
                {formatMoney(p.default_price)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reset Demo Data */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">
            {t('settings.demo_reset')}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Akmal Karimov va Bobur Aliyev operatsiyalari bilan demo holatiga qaytarish
          </p>
        </div>

        <button
          onClick={handleResetDemo}
          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Tiklash</span>
        </button>
      </div>

      {/* Account & Logout */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">
            {user ? `${user.full_name || 'Foydalanuvchi'} (${user.email})` : 'Tizimga kirilgan'}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Joriy biznes: {business.name}
          </p>
        </div>

        <button
          onClick={() => signOut()}
          className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t('settings.logout')}</span>
        </button>
      </div>
    </div>
  );
};
