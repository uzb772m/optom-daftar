import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Search, Plus, Phone, Store, MapPin, 
  ChevronRight, ArrowUpDown, AlertCircle, X 
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { formatMoney } from '../../lib/money';
import { computeClientBalance, computeSalesAllocation } from '../../lib/allocation';
import { matchClientSearch, formatPhoneNumber, cleanPhoneDigits } from '../../lib/search';
import { getTodayDateString, isOverdue } from '../../lib/date';
import { ClientFormModal } from './ClientFormModal';

export const ClientsPage: React.FC = () => {
  const { t } = useTranslation();
  const { clients, sales, payments } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'debtors' | 'overdue' | 'advance' | 'archive'>(
    (searchParams.get('tab') as any) || 'all'
  );
  const [sortBy, setSortBy] = useState<'debt' | 'name' | 'activity'>('debt');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const todayStr = getTodayDateString();

  // Compute balances for all clients
  const clientData = useMemo(() => {
    return clients.map(client => {
      const clientSales = sales.filter(s => s.client_id === client.id);
      const clientPayments = payments.filter(p => p.client_id === client.id);
      const balance = computeClientBalance(clientSales, clientPayments);

      // Check overdue
      let hasOverdue = false;
      if (balance > 0) {
        const alloc = computeSalesAllocation(clientSales, clientPayments);
        for (const s of clientSales) {
          if (s.status === 'active' && s.due_date) {
            const itemAlloc = alloc.get(s.id);
            const rem = itemAlloc ? itemAlloc.remaining : s.total;
            if (rem > 0 && isOverdue(s.due_date, rem, todayStr)) {
              hasOverdue = true;
              break;
            }
          }
        }
      }

      // Last activity date
      const allDates = [
        ...clientSales.map(s => s.created_at),
        ...clientPayments.map(p => p.created_at)
      ].sort().reverse();
      const lastActivity = allDates[0] || client.created_at;

      return {
        client,
        balance,
        hasOverdue,
        lastActivity
      };
    });
  }, [clients, sales, payments, todayStr]);

  // Filter & Search
  const filteredClients = useMemo(() => {
    return clientData.filter(({ client, balance, hasOverdue }) => {
      // Archive tab check
      if (activeTab === 'archive') {
        if (!client.is_archived) return false;
      } else {
        if (client.is_archived) return false;
      }

      // Tab filters
      if (activeTab === 'debtors' && balance <= 0) return false;
      if (activeTab === 'overdue' && !hasOverdue) return false;
      if (activeTab === 'advance' && balance >= 0) return false;

      // Text search
      return matchClientSearch(client, searchQuery);
    }).sort((a, b) => {
      if (sortBy === 'debt') {
        return b.balance - a.balance;
      }
      if (sortBy === 'name') {
        return a.client.full_name.localeCompare(b.client.full_name);
      }
      // activity
      return b.lastActivity.localeCompare(a.lastActivity);
    });
  }, [clientData, activeTab, searchQuery, sortBy]);

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-5 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('clients.title')}
          </h1>
          <p className="text-xs text-slate-500">
            Jami {clients.filter(c => !c.is_archived).length} ta mijoz
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{t('clients.add_client')}</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('common.search')}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Chips & Sort */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {t('clients.all_tab')}
          </button>

          <button
            onClick={() => setActiveTab('debtors')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'debtors'
                ? 'bg-rose-600 text-white'
                : 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {t('clients.debtors_tab')}
          </button>

          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'overdue'
                ? 'bg-amber-600 text-white'
                : 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {t('clients.overdue_tab')}
          </button>

          <button
            onClick={() => setActiveTab('advance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'advance'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {t('clients.advance_tab')}
          </button>

          <button
            onClick={() => setActiveTab('archive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'archive'
                ? 'bg-slate-700 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {t('clients.archive_tab')}
          </button>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-1 shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="text-xs bg-transparent text-slate-600 dark:text-slate-400 font-medium focus:outline-none cursor-pointer"
          >
            <option value="debt">{t('clients.sort_by_debt')}</option>
            <option value="name">{t('clients.sort_by_name')}</option>
            <option value="activity">{t('clients.sort_by_activity')}</option>
          </select>
        </div>
      </div>

      {/* Client List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800/80">
        {filteredClients.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <p className="text-sm text-slate-500 font-medium">
              {searchQuery ? "Qidiruv bo'yicha hech kim topilmadi" : t('common.empty')}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yangi mijoz qo'shish</span>
            </button>
          </div>
        ) : (
          filteredClients.map(({ client, balance, hasOverdue }) => {
            const hasDebt = balance > 0;
            const hasAdvance = balance < 0;
            const isZero = balance === 0;

            return (
              <Link
                key={client.id}
                to={`/clients/${client.id}`}
                className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Avatar circle with initials */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    hasDebt 
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400' 
                      : hasAdvance
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {client.full_name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                        {client.full_name}
                      </h3>
                      {hasOverdue && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                          Muddati o'tgan
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {(client.shop_name || client.market) && (
                        <span className="flex items-center gap-1 truncate">
                          <Store className="w-3 h-3 shrink-0" />
                          <span className="truncate">{client.shop_name || client.market}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1 shrink-0">
                        <Phone className="w-3 h-3" />
                        <span>{client.phone}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Balance & Arrow */}
                <div className="flex items-center gap-2 shrink-0 ml-3 text-right">
                  <div>
                    {hasDebt && (
                      <div className="text-sm font-extrabold font-tabular text-rose-600 dark:text-rose-400">
                        {formatMoney(balance)}
                      </div>
                    )}
                    {hasAdvance && (
                      <div className="text-sm font-extrabold font-tabular text-emerald-600 dark:text-emerald-400">
                        Avans: {formatMoney(Math.abs(balance))}
                      </div>
                    )}
                    {isZero && (
                      <div className="text-xs font-semibold text-slate-400">
                        {t('clients.no_debt')}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Modal for adding new client */}
      {isModalOpen && (
        <ClientFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};
