import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, ArrowDownLeft, AlertCircle, 
  ChevronRight, Plus, CreditCard, ShoppingBag, 
  Clock, CheckCircle2 
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { formatMoney } from '../../lib/money';
import { computeClientBalance, computeSalesAllocation } from '../../lib/allocation';
import { getTodayDateString, isOverdue } from '../../lib/date';

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { clients, sales, payments, business } = useStore();

  const todayStr = getTodayDateString();

  // 1. Calculate client balances and identify debtors
  const clientBalances = clients.map(client => {
    const clientSales = sales.filter(s => s.client_id === client.id);
    const clientPayments = payments.filter(p => p.client_id === client.id);
    const balance = computeClientBalance(clientSales, clientPayments);
    return {
      client,
      balance,
      sales: clientSales,
      payments: clientPayments
    };
  });

  // Jami qarzdorlik = sum of positive balances
  const debtorBalances = clientBalances.filter(cb => cb.balance > 0 && !cb.client.is_archived);
  const totalDebt = debtorBalances.reduce((sum, cb) => sum + cb.balance, 0);
  const debtorClientsCount = debtorBalances.length;

  // 2. Cards:
  // "Bugungi savdo" (sum and count, kind 'sale' only — opening debt does not count in sales total!)
  const todayActiveSales = sales.filter(s => s.status === 'active' && s.kind === 'sale' && s.sale_date === todayStr);
  const todaySalesSum = todayActiveSales.reduce((sum, s) => sum + s.total, 0);
  const todaySalesCount = todayActiveSales.length;

  // "Bugun tushgan pul" (sum of active payments today)
  const todayActivePayments = payments.filter(p => p.status === 'active' && p.payment_date === todayStr);
  const todayCollectedSum = todayActivePayments.reduce((sum, p) => sum + p.amount, 0);

  // "Muddati o'tgan" (sum and count)
  let overdueSum = 0;
  let overdueCount = 0;

  for (const cb of debtorBalances) {
    const alloc = computeSalesAllocation(cb.sales, cb.payments);
    for (const s of cb.sales) {
      if (s.status === 'active' && s.due_date) {
        const itemAlloc = alloc.get(s.id);
        const rem = itemAlloc ? itemAlloc.remaining : s.total;
        if (rem > 0 && isOverdue(s.due_date, rem, todayStr)) {
          overdueSum += rem;
          overdueCount++;
        }
      }
    }
  }

  // 3. Top 10 debtors
  const topDebtors = [...debtorBalances]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 10);

  // 4. Last 10 operations
  type Operation = {
    id: string;
    type: 'sale' | 'payment';
    kind?: string;
    date: string;
    created_at: string;
    title: string;
    clientName: string;
    clientId: string;
    amount: number;
    status: 'active' | 'void';
  };

  const ops: Operation[] = [];

  for (const s of sales) {
    const client = clients.find(c => c.id === s.client_id);
    ops.push({
      id: s.id,
      type: 'sale',
      kind: s.kind,
      date: s.sale_date,
      created_at: s.created_at,
      title: s.kind === 'opening' ? "Eski qarz" : `Savdo №${s.number ?? ''}`,
      clientName: client?.full_name || "Noma'lum",
      clientId: s.client_id,
      amount: s.total,
      status: s.status
    });
  }

  for (const p of payments) {
    const client = clients.find(c => c.id === p.client_id);
    ops.push({
      id: p.id,
      type: 'payment',
      date: p.payment_date,
      created_at: p.created_at,
      title: `To'lov (${p.method.toUpperCase()})`,
      clientName: client?.full_name || "Noma'lum",
      clientId: p.client_id,
      amount: p.amount,
      status: p.status
    });
  }

  const recentOps = ops
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 10);

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-5 space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-blue-600 dark:text-blue-400">
            {business.name}
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('nav.home')}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/payments/new"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all"
          >
            <CreditCard className="w-4 h-4" />
            <span>+ To'lov qabul qilish</span>
          </Link>
          <Link
            to="/sales/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Yangi savdo</span>
          </Link>
        </div>
      </div>

      {/* Large Total Debt Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl relative overflow-hidden border border-slate-700/50">
        <div className="absolute -right-8 -top-8 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-44 h-44 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-300">
              {t('home.total_debt')}
            </p>
            <div className="text-3xl md:text-4xl font-extrabold font-tabular text-rose-400 tracking-tight mt-1">
              {formatMoney(totalDebt)}
            </div>
            <p className="text-xs font-medium text-slate-400 mt-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              {t('home.debtor_clients_count', { count: debtorClientsCount })}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 md:pt-0">
            <Link
              to="/clients?tab=debtors"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold backdrop-blur-sm transition-colors border border-white/10"
            >
              Qarzdorlarni ko'rish
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Bugungi savdo */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">{t('home.today_sales')}</span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-tabular text-slate-900 dark:text-white mt-2">
            {formatMoney(todaySalesSum)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {todaySalesCount} ta savdo
          </p>
        </div>

        {/* Bugun tushgan pul */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">{t('home.today_collected')}</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-tabular text-emerald-600 dark:text-emerald-400 mt-2">
            {formatMoney(todayCollectedSum)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {todayActivePayments.length} ta to'lov
          </p>
        </div>

        {/* Muddati o'tgan */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">{t('home.overdue')}</span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold font-tabular text-rose-600 dark:text-rose-400 mt-2">
            {formatMoney(overdueSum)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {overdueCount} ta savdo muddati o'tgan
          </p>
        </div>
      </div>

      {/* Two columns: Top 10 Debtors & Recent operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Top 10 Debtors */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>{t('home.top_debtors')}</span>
            </h2>
            <Link
              to="/clients?tab=debtors"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Hammasi
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-1">
            {topDebtors.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                {t('home.no_debtors')}
              </p>
            ) : (
              topDebtors.map(({ client, balance }, idx) => (
                <Link
                  key={client.id}
                  to={`/clients/${client.id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-xs font-bold text-slate-400 text-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {client.full_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {client.shop_name || client.market || client.phone}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold font-tabular text-rose-600 dark:text-rose-400">
                      {formatMoney(balance)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 inline-block ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Last 10 Operations */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{t('home.recent_operations')}</span>
            </h2>
            <Link
              to="/history"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Tarixga o'tish
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-1">
            {recentOps.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                {t('home.no_operations')}
              </p>
            ) : (
              recentOps.map(op => {
                const isVoid = op.status === 'void';
                const isPay = op.type === 'payment';

                return (
                  <Link
                    key={op.id}
                    to={`/clients/${op.clientId}`}
                    className={`flex items-center justify-between py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors ${
                      isVoid ? 'opacity-40 line-through' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isPay ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/60'
                      }`}>
                        {isPay ? <ArrowDownLeft className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                          {op.title} — <span className="text-slate-500 font-normal">{op.clientName}</span>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {op.date}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs font-bold font-tabular ${
                        isPay ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                      }`}>
                        {isPay ? '+' : '-'}{formatMoney(op.amount)}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
