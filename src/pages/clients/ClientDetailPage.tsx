import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Phone, MessageSquare, Send, ArrowLeft, 
  PlusCircle, CreditCard, ShoppingBag, ArrowDownLeft, 
  AlertCircle, ChevronRight, X, RotateCcw, Ban, Edit 
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { formatMoney } from '../../lib/money';
import { computeClientBalance, computeSalesAllocation, computeHistoryAndRunningBalance } from '../../lib/allocation';
import { cleanPhoneDigits } from '../../lib/search';
import { formatDateDDMMYYYY, formatDateTime } from '../../lib/date';
import { Sale, Payment } from '../../types';

export const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { clients, sales, payments, voidSale, voidPayment } = useStore();

  const [activeTab, setActiveTab] = useState<'history' | 'sales' | 'payments'>('history');

  // Selected item modal for view / void / correct
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  const client = clients.find(c => c.id === id);

  if (!client) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <p className="text-slate-500">Mijoz topilmadi</p>
        <Link to="/clients" className="mt-4 inline-block text-xs font-bold text-blue-600 hover:underline">
          Mijozlar ro'yxatiga qaytish
        </Link>
      </div>
    );
  }

  const clientSales = sales.filter(s => s.client_id === client.id);
  const clientPayments = payments.filter(p => p.client_id === client.id);

  // Balance calculation
  const balance = computeClientBalance(clientSales, clientPayments);
  const isDebt = balance > 0;
  const isAdvance = balance < 0;

  // Allocation calculation
  const allocation = computeSalesAllocation(clientSales, clientPayments);

  // History with running balance calculation
  const rawHistory = computeHistoryAndRunningBalance(clientSales, clientPayments);
  // Show newest first on client page
  const historyItems = [...rawHistory].reverse();

  // Clean phone digits for messaging URLs
  const rawPhone = cleanPhoneDigits(client.phone);
  const intlPhone = rawPhone.startsWith('998') ? rawPhone : '998' + rawPhone;

  const handleOpenVoidDialog = () => {
    setVoidReason('');
    setVoidDialogOpen(true);
  };

  const handleConfirmVoid = async () => {
    if (!voidReason.trim()) return;
    setIsVoiding(true);
    try {
      if (selectedSale) {
        await voidSale(selectedSale.id, voidReason.trim());
        setSelectedSale(null);
      } else if (selectedPayment) {
        await voidPayment(selectedPayment.id, voidReason.trim());
        setSelectedPayment(null);
      }
      setVoidDialogOpen(false);
    } catch (e: any) {
      alert(e.message || "Xatolik yuz berdi");
    } finally {
      setIsVoiding(false);
    }
  };

  const handleCorrectSale = () => {
    if (!selectedSale) return;
    // Redirect to new sale form prefilled
    navigate(`/sales/new?correct_sale_id=${selectedSale.id}&client_id=${client.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-5 space-y-5">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/clients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('clients.title')}</span>
        </Link>
      </div>

      {/* Client Profile Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {client.full_name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {[client.shop_name, client.market].filter(Boolean).join(' • ') || "Do'kon ko'rsatilmagan"}
            </p>
          </div>

          {/* Large Balance Display */}
          <div className="sm:text-right">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              {isDebt ? t('clients.debt_label') : isAdvance ? t('clients.advance_label') : t('clients.no_debt')}
            </span>
            <div className={`text-2xl sm:text-3xl font-extrabold font-tabular tracking-tight ${
              isDebt ? 'text-rose-600 dark:text-rose-400' : isAdvance ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
            }`}>
              {formatMoney(Math.abs(balance))}
            </div>
          </div>
        </div>

        {/* Quick Action Contact Buttons: Call, Telegram, SMS, WhatsApp */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100 dark:border-slate-800">
          <a
            href={`tel:${client.phone}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-blue-600" />
            <span>{t('clients.call')}</span>
          </a>

          <a
            href={`https://t.me/+${intlPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-400 text-xs font-semibold transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t('clients.telegram')}</span>
          </a>

          <a
            href={`sms:${client.phone}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('clients.sms')}</span>
          </a>

          <a
            href={`https://wa.me/${intlPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{t('clients.whatsapp')}</span>
          </a>
        </div>

        {/* Primary Action Buttons: + Savdo, + To'lov */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link
            to={`/sales/new?client_id=${client.id}`}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Savdo</span>
          </Link>

          <Link
            to={`/payments/new?client_id=${client.id}`}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <CreditCard className="w-4 h-4" />
            <span>+ To'lov</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          {t('history.all_history')} ({historyItems.length})
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'sales'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          {t('history.sales_tab')} ({clientSales.length})
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'payments'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          {t('history.payments_tab')} ({clientPayments.length})
        </button>
      </div>

      {/* Tab 1: Chronological Running History */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 shadow-sm">
          {historyItems.length === 0 ? (
            <p className="text-xs text-slate-400 p-8 text-center">{t('common.empty')}</p>
          ) : (
            historyItems.map((item) => {
              const isVoid = item.status === 'void';
              const isPay = item.is_payment;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.type === 'payment') setSelectedPayment(item.details);
                    else setSelectedSale(item.details);
                  }}
                  className={`p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                    isVoid ? 'opacity-40 line-through bg-slate-50/50 dark:bg-slate-900/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isPay 
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60' 
                        : 'bg-blue-50 text-blue-600 dark:bg-blue-950/60'
                    }`}>
                      {isPay ? <ArrowDownLeft className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {item.title}
                        </span>
                        {isVoid && (
                          <span className="no-underline text-[10px] font-bold text-rose-500">
                            (Bekor: {item.void_reason})
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {formatDateDDMMYYYY(item.date)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-xs font-bold font-tabular ${
                      isPay ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                    }`}>
                      {isPay ? '+' : '-'}{formatMoney(item.amount)}
                    </span>
                    <span className="text-[11px] text-slate-400 block font-tabular font-medium">
                      Qoldiq: {formatMoney(item.running_balance)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Sales List with Allocations */}
      {activeTab === 'sales' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 shadow-sm">
          {clientSales.length === 0 ? (
            <p className="text-xs text-slate-400 p-8 text-center">{t('common.empty')}</p>
          ) : (
            [...clientSales].reverse().map(sale => {
              const isVoid = sale.status === 'void';
              const alloc = allocation.get(sale.id);
              const remaining = alloc ? alloc.remaining : sale.total;
              const status = alloc ? alloc.status : (isVoid ? 'Bekor qilingan' : "To'lanmagan");

              return (
                <div
                  key={sale.id}
                  onClick={() => setSelectedSale(sale)}
                  className={`p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                    isVoid ? 'opacity-40 line-through' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {sale.kind === 'opening' ? "Eski qarz (daftardan)" : `Savdo №${sale.number ?? ''}`}
                      </span>
                      {!isVoid && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          status === "To'langan" 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                            : status === "Qisman to'langan"
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                        }`}>
                          {status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDateDDMMYYYY(sale.sale_date)} • {sale.items?.length || 1} ta mahsulot
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold font-tabular text-slate-900 dark:text-white">
                      {formatMoney(sale.total)}
                    </div>
                    {!isVoid && (
                      <span className="text-xs font-semibold font-tabular text-rose-600 dark:text-rose-400 block mt-0.5">
                        Qoldiq: {formatMoney(remaining)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 3: Payments List */}
      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 shadow-sm">
          {clientPayments.length === 0 ? (
            <p className="text-xs text-slate-400 p-8 text-center">{t('common.empty')}</p>
          ) : (
            [...clientPayments].reverse().map(payment => {
              const isVoid = payment.status === 'void';

              return (
                <div
                  key={payment.id}
                  onClick={() => setSelectedPayment(payment)}
                  className={`p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                    isVoid ? 'opacity-40 line-through' : ''
                  }`}
                >
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      To'lov ({payment.method.toUpperCase()})
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDateDDMMYYYY(payment.payment_date)} {payment.note && `• ${payment.note}`}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold font-tabular text-emerald-600 dark:text-emerald-400">
                      +{formatMoney(payment.amount)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {selectedSale.kind === 'opening' ? "Eski qarz (daftardan)" : `Savdo №${selectedSale.number ?? ''}`}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDateDDMMYYYY(selectedSale.sale_date)}
                </p>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items table */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {selectedSale.items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 dark:border-slate-800/60">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</span>
                    <span className="text-slate-400 block text-[11px] font-tabular">
                      {item.quantity} {item.unit} × {formatMoney(item.unit_price)}
                    </span>
                  </div>
                  <span className="font-bold font-tabular text-slate-900 dark:text-white">
                    {formatMoney(item.line_total)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1 font-medium">
              <div className="flex justify-between text-slate-500">
                <span>{t('sales.subtotal')}:</span>
                <span className="font-tabular">{formatMoney(selectedSale.subtotal)}</span>
              </div>
              {selectedSale.discount > 0 && (
                <div className="flex justify-between text-rose-500">
                  <span>{t('sales.discount')}:</span>
                  <span className="font-tabular">-{formatMoney(selectedSale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-1">
                <span>{t('sales.payable_total')}:</span>
                <span className="font-tabular">{formatMoney(selectedSale.total)}</span>
              </div>
            </div>

            {/* Actions: Owner-only 'Tuzatish' and 'Bekor qilish' */}
            {selectedSale.status === 'active' && (
              <div className="grid grid-cols-2 gap-2.5 pt-3">
                <button
                  onClick={handleCorrectSale}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>{t('detail.correct_btn')}</span>
                </button>

                <button
                  onClick={handleOpenVoidDialog}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold transition-colors"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{t('detail.void_btn')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                To'lov tafsiloti
              </h3>
              <button onClick={() => setSelectedPayment(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Summa:</span>
                <span className="font-bold font-tabular text-emerald-600 text-base">{formatMoney(selectedPayment.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Usul:</span>
                <span className="font-semibold">{selectedPayment.method.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sana:</span>
                <span>{formatDateDDMMYYYY(selectedPayment.payment_date)}</span>
              </div>
              {selectedPayment.note && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Izoh:</span>
                  <span>{selectedPayment.note}</span>
                </div>
              )}
            </div>

            {selectedPayment.status === 'active' && (
              <div className="pt-3">
                <button
                  onClick={handleOpenVoidDialog}
                  className="w-full py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold transition-colors"
                >
                  {t('detail.void_btn')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Void Dialog */}
      {voidDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>{t('detail.void_dialog_title')}</span>
            </h3>

            <p className="text-xs text-slate-500">
              {t('detail.void_reason_prompt')}
            </p>

            <input
              type="text"
              required
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Masalan: Xato kiritildi"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoidDialogOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={!voidReason.trim() || isVoiding}
                onClick={handleConfirmVoid}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold disabled:opacity-50"
              >
                {isVoiding ? t('common.saving') : t('detail.void_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
