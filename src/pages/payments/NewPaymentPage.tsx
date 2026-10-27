import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ArrowLeft, CreditCard } from 'lucide-react';
import { useStore } from '../../lib/store';
import { formatMoney, parseMoney, formatNumberWithSpaces } from '../../lib/money';
import { getTodayDateString } from '../../lib/date';
import { computeClientBalance } from '../../lib/allocation';
import { matchClientSearch } from '../../lib/search';
import { PaymentMethod } from '../../types';

export const NewPaymentPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clients, sales, payments, createPayment } = useStore();

  const prefilledClientId = searchParams.get('client_id') || '';

  const [clientId, setClientId] = useState<string>(prefilledClientId);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('naqd');
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [note, setNote] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<{ amount: number; clientId: string } | null>(null);

  const selectedClient = clients.find(c => c.id === clientId);

  const currentDebt = useMemo(() => {
    if (!selectedClient) return 0;
    const cSales = sales.filter(s => s.client_id === selectedClient.id);
    const cPayments = payments.filter(p => p.client_id === selectedClient.id);
    return computeClientBalance(cSales, cPayments);
  }, [selectedClient, sales, payments]);

  const filteredClients = useMemo(() => {
    return clients
      .filter(c => !c.is_archived)
      .filter(c => matchClientSearch(c, clientSearchQuery))
      .slice(0, 8);
  }, [clients, clientSearchQuery]);

  const amount = parseMoney(amountStr);
  const debtAfterPayment = currentDebt - amount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      alert("Iltimos, mijozni tanlang!");
      return;
    }
    if (amount <= 0) {
      alert("To'lov summasi noldan katta bo'lishi kerak!");
      return;
    }

    setIsSaving(true);
    try {
      await createPayment({
        client_id: clientId,
        amount,
        method,
        payment_date: paymentDate,
        note: note.trim() || null
      });

      setSavedSuccess({
        amount,
        clientId
      });
    } catch (err: any) {
      alert(err.message || "Xatolik yuz berdi");
    } finally {
      setIsSaving(false);
    }
  };

  if (savedSuccess) {
    return (
      <div className="max-w-md mx-auto w-full px-4 py-16 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {t('payments.success_title')}
          </h2>
          <p className="text-base font-extrabold font-tabular text-emerald-600 dark:text-emerald-400 mt-1">
            +{formatMoney(savedSuccess.amount)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4">
          <button
            onClick={() => {
              setSavedSuccess(null);
              setAmountStr('');
              setNote('');
            }}
            className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"
          >
            Yana to'lov
          </button>

          <Link
            to={`/clients/${savedSuccess.clientId}`}
            className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center"
          >
            Mijoz sahifasi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto w-full px-4 py-5 space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
          {t('payments.title')}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Client Selection */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            {t('payments.client')} *
          </label>

          {selectedClient ? (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {selectedClient.full_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedClient.phone} {selectedClient.shop_name && `• ${selectedClient.shop_name}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setClientId('')}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 underline"
              >
                O'zgartirish
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                placeholder="Mijoz qidirish..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-800">
                {filteredClients.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setClientId(c.id);
                      setClientSearchQuery('');
                    }}
                    className="w-full p-2.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                  >
                    <span className="font-bold text-slate-900 dark:text-white">{c.full_name}</span>
                    <span className="text-slate-400">{c.shop_name || c.phone}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Current Debt in large type */}
          {selectedClient && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400 block font-medium">
                {t('payments.current_debt')}:
              </span>
              <div className={`text-2xl font-extrabold font-tabular mt-0.5 ${
                currentDebt > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {currentDebt > 0 ? formatMoney(currentDebt) : `Avans: ${formatMoney(Math.abs(currentDebt))}`}
              </div>
            </div>
          )}
        </div>

        {/* Payment Amount & Method */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('payments.payment_amount')} (so'm) *
              </label>

              {currentDebt > 0 && (
                <button
                  type="button"
                  onClick={() => setAmountStr(String(currentDebt))}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-colors"
                >
                  {t('payments.pay_full')}
                </button>
              )}
            </div>

            <input
              type="text"
              inputMode="numeric"
              required
              value={formatNumberWithSpaces(amountStr)}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0"
              className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xl font-bold font-tabular text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
              {t('payments.method')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'naqd', label: 'Naqd' },
                { key: 'karta', label: 'Karta' },
                { key: 'click', label: 'Click' },
                { key: 'payme', label: 'Payme' },
                { key: 'otkazma', label: "O'tkazma" },
                { key: 'boshqa', label: 'Boshqa' }
              ].map(m => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMethod(m.key as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                    method === m.key
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Remaining After Payment */}
          {selectedClient && amount > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {debtAfterPayment > 0 ? t('payments.debt_after_payment') : t('payments.advance_after_payment')}:
              </span>
              <span className={`font-extrabold font-tabular text-sm ${
                debtAfterPayment > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}>
                {formatMoney(Math.abs(debtAfterPayment))}
              </span>
            </div>
          )}

          {/* Date & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('common.date')}
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('common.note')}
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Masalan: Qarzning bir qismi"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving || !clientId || amount <= 0}
          className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 transition-all disabled:opacity-50 active:scale-[0.99]"
        >
          {isSaving ? t('common.saving') : "To'lovni saqlash"}
        </button>
      </form>
    </div>
  );
};
