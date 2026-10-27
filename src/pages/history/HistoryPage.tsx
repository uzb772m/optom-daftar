import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ShoppingBag, ArrowDownLeft, Filter, 
  ChevronRight, Calendar, User 
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { formatMoney } from '../../lib/money';
import { formatDateDDMMYYYY, getTodayDateString, addDaysToDate } from '../../lib/date';
import { computeSalesAllocation } from '../../lib/allocation';

export const HistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const { sales, payments, clients } = useStore();

  const [activeTab, setActiveTab] = useState<'sales' | 'payments'>('sales');
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('all');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [showVoided, setShowVoided] = useState<boolean>(false);

  const today = getTodayDateString();
  const yesterday = addDaysToDate(today, -1);
  const weekAgo = addDaysToDate(today, -7);
  const monthAgo = addDaysToDate(today, -30);

  // Filter Sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (!showVoided && s.status === 'void') return false;
      if (selectedClientId !== 'all' && s.client_id !== selectedClientId) return false;

      if (period === 'today') return s.sale_date === today;
      if (period === 'yesterday') return s.sale_date === yesterday;
      if (period === 'week') return s.sale_date >= weekAgo;
      if (period === 'month') return s.sale_date >= monthAgo;

      return true;
    }).sort((a, b) => b.sale_date.localeCompare(a.sale_date) || b.created_at.localeCompare(a.created_at));
  }, [sales, showVoided, selectedClientId, period, today, yesterday, weekAgo, monthAgo]);

  // Filter Payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (!showVoided && p.status === 'void') return false;
      if (selectedClientId !== 'all' && p.client_id !== selectedClientId) return false;

      if (period === 'today') return p.payment_date === today;
      if (period === 'yesterday') return p.payment_date === yesterday;
      if (period === 'week') return p.payment_date >= weekAgo;
      if (period === 'month') return p.payment_date >= monthAgo;

      return true;
    }).sort((a, b) => b.payment_date.localeCompare(a.payment_date) || b.created_at.localeCompare(a.created_at));
  }, [payments, showVoided, selectedClientId, period, today, yesterday, weekAgo, monthAgo]);

  // Totals of the filtered range on top
  const totalSalesSum = useMemo(() => {
    return filteredSales
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + s.total, 0);
  }, [filteredSales]);

  const totalPaymentsSum = useMemo(() => {
    return filteredPayments
      .filter(p => p.status === 'active')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-5 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {t('history.title')}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Savdo va to'lovlar jurnali
        </p>
      </div>

      {/* Filter range totals card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm grid grid-cols-2 gap-4">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">
            Tanlangan davr savdosi
          </span>
          <div className="text-lg sm:text-xl font-bold font-tabular text-slate-900 dark:text-white mt-0.5">
            {formatMoney(totalSalesSum)}
          </div>
          <span className="text-[10px] text-slate-400">
            {filteredSales.filter(s => s.status === 'active').length} ta faol savdo
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">
            Tanlangan davr to'lovi
          </span>
          <div className="text-lg sm:text-xl font-bold font-tabular text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatMoney(totalPaymentsSum)}
          </div>
          <span className="text-[10px] text-slate-400">
            {filteredPayments.filter(p => p.status === 'active').length} ta to'lov
          </span>
        </div>
      </div>

      {/* Tabs & Period filter chips */}
      <div className="space-y-3">
        {/* Main Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('sales')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'sales'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t('history.sales_tab')} ({filteredSales.length})
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'payments'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t('history.payments_tab')} ({filteredPayments.length})
          </button>
        </div>

        {/* Period Chips */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-1">
          <div className="flex items-center gap-1.5">
            {[
              { key: 'all', label: t('common.all') },
              { key: 'today', label: t('common.today') },
              { key: 'yesterday', label: t('common.yesterday') },
              { key: 'week', label: t('common.this_week') },
              { key: 'month', label: t('common.this_month') }
            ].map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  period === p.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Show Voided Checkbox */}
          <label className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap cursor-pointer">
            <input
              type="checkbox"
              checked={showVoided}
              onChange={(e) => setShowVoided(e.target.checked)}
              className="rounded text-blue-600 w-3.5 h-3.5"
            />
            <span>{t('history.show_voided')}</span>
          </label>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 shadow-sm">
        {activeTab === 'sales' ? (
          filteredSales.length === 0 ? (
            <p className="text-xs text-slate-400 p-8 text-center">{t('common.empty')}</p>
          ) : (
            filteredSales.map(sale => {
              const client = clients.find(c => c.id === sale.client_id);
              const isVoid = sale.status === 'void';

              return (
                <Link
                  key={sale.id}
                  to={`/clients/${sale.client_id}`}
                  className={`p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                    isVoid ? 'opacity-40 line-through bg-slate-50/50 dark:bg-slate-900/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {sale.kind === 'opening' ? "Eski qarz" : `Savdo №${sale.number ?? ''}`}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          — {client?.full_name || 'Mijoz'}
                        </span>
                        {isVoid && (
                          <span className="no-underline text-[10px] font-bold text-rose-500">
                            (Bekor: {sale.void_reason})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDateDDMMYYYY(sale.sale_date)} • {sale.items?.length || 1} ta mahsulot
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold font-tabular text-slate-900 dark:text-white">
                      {formatMoney(sale.total)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 inline-block ml-1" />
                  </div>
                </Link>
              );
            })
          )
        ) : (
          filteredPayments.length === 0 ? (
            <p className="text-xs text-slate-400 p-8 text-center">{t('common.empty')}</p>
          ) : (
            filteredPayments.map(payment => {
              const client = clients.find(c => c.id === payment.client_id);
              const isVoid = payment.status === 'void';

              return (
                <Link
                  key={payment.id}
                  to={`/clients/${payment.client_id}`}
                  className={`p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                    isVoid ? 'opacity-40 line-through bg-slate-50/50 dark:bg-slate-900/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          To'lov ({payment.method.toUpperCase()})
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          — {client?.full_name || 'Mijoz'}
                        </span>
                        {isVoid && (
                          <span className="no-underline text-[10px] font-bold text-rose-500">
                            (Bekor: {payment.void_reason})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDateDDMMYYYY(payment.payment_date)} {payment.note && `• ${payment.note}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold font-tabular text-emerald-600 dark:text-emerald-400">
                      +{formatMoney(payment.amount)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 inline-block ml-1" />
                  </div>
                </Link>
              );
            })
          )
        )}
      </div>
    </div>
  );
};
