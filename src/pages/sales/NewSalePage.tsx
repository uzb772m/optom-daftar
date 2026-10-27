import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Trash2, CheckCircle2, ArrowLeft, 
  Store, AlertCircle, ShoppingBag, Zap, UserPlus 
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { formatMoney, parseMoney, formatNumberWithSpaces, calculateLineTotal } from '../../lib/money';
import { getTodayDateString, addDaysToDate } from '../../lib/date';
import { matchClientSearch } from '../../lib/search';
import { computeClientBalance } from '../../lib/allocation';
import { ClientFormModal } from '../clients/ClientFormModal';
import { PaymentMethod } from '../../types';

interface ItemFormState {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  unit_price: string;
  addToCatalog: boolean;
}

export const NewSalePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clients, products, sales, payments, createSale, correctSale, addProduct } = useStore();

  const prefilledClientId = searchParams.get('client_id') || '';
  const correctSaleId = searchParams.get('correct_sale_id') || '';

  // Form states
  const [clientId, setClientId] = useState<string>(prefilledClientId);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  const [mode, setMode] = useState<'items' | 'quick'>('items');
  const [saleDate, setSaleDate] = useState<string>(getTodayDateString());
  const [dueDate, setDueDate] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // Quick mode fields
  const [quickTitle, setQuickTitle] = useState('');
  const [quickAmount, setQuickAmount] = useState('');

  // Items mode fields
  const [items, setItems] = useState<ItemFormState[]>([
    { id: '1', name: '', quantity: '1', unit: 'dona', unit_price: '', addToCatalog: false }
  ]);

  const [discountStr, setDiscountStr] = useState<string>('0');
  const [paidNowStr, setPaidNowStr] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('naqd');

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<{ number?: number | null; total: number; clientId: string } | null>(null);

  // If correcting an existing sale, prefill everything
  useEffect(() => {
    if (correctSaleId) {
      const old = sales.find(s => s.id === correctSaleId);
      if (old) {
        setClientId(old.client_id);
        setSaleDate(old.sale_date);
        setDueDate(old.due_date || '');
        setNote(old.note || '');
        setDiscountStr(old.discount ? old.discount.toString() : '0');
        if (old.items && old.items.length > 0) {
          setItems(old.items.map((it, idx) => ({
            id: String(idx + 1),
            name: it.name,
            quantity: String(it.quantity),
            unit: it.unit,
            unit_price: String(it.unit_price),
            addToCatalog: false
          })));
        }
      }
    }
  }, [correctSaleId, sales]);

  // Selected client details & current balance
  const selectedClient = clients.find(c => c.id === clientId);
  const currentClientBalance = useMemo(() => {
    if (!selectedClient) return 0;
    const cSales = sales.filter(s => s.client_id === selectedClient.id);
    const cPayments = payments.filter(p => p.client_id === selectedClient.id);
    return computeClientBalance(cSales, cPayments);
  }, [selectedClient, sales, payments]);

  // Filter clients for dropdown
  const filteredClients = useMemo(() => {
    return clients
      .filter(c => !c.is_archived)
      .filter(c => matchClientSearch(c, clientSearchQuery))
      .slice(0, 10);
  }, [clients, clientSearchQuery]);

  // Calculations
  const subtotal = useMemo(() => {
    if (mode === 'quick') {
      return parseMoney(quickAmount);
    }
    return items.reduce((sum, item) => {
      const q = parseFloat(item.quantity) || 0;
      const p = parseMoney(item.unit_price);
      return sum + calculateLineTotal(q, p);
    }, 0);
  }, [mode, quickAmount, items]);

  const discount = parseMoney(discountStr);
  const payableTotal = Math.max(0, subtotal - discount);
  const paidNow = parseMoney(paidNowStr);
  const remainsDebt = Math.max(0, payableTotal - paidNow);
  const clientNewTotalDebt = currentClientBalance + payableTotal - paidNow;

  // Warning when paidNow exceeds sale total (excess goes to older debt or advance)
  const isExcessPaid = paidNow > payableTotal && payableTotal > 0;

  // Item row operations
  const handleAddItemRow = () => {
    setItems([
      ...items,
      { id: String(Date.now()), name: '', quantity: '1', unit: 'dona', unit_price: '', addToCatalog: false }
    ]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter(it => it.id !== id));
  };

  const handleProductSelect = (index: number, productName: string) => {
    const found = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
    const newItems = [...items];
    newItems[index].name = productName;
    if (found) {
      newItems[index].unit = found.unit;
      newItems[index].unit_price = String(found.default_price);
    }
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      alert("Iltimos, mijozni tanlang!");
      return;
    }
    if (subtotal <= 0) {
      alert("Savdo summasi noldan katta bo'lishi kerak!");
      return;
    }

    setIsSaving(true);
    try {
      // Build items array
      let formattedItems = [];
      if (mode === 'quick') {
        formattedItems.push({
          name: quickTitle.trim() || 'Tovarlar',
          unit: 'dona',
          quantity: 1,
          unit_price: subtotal
        });
      } else {
        formattedItems = items.map(it => {
          // If user marked 'add to catalog', save product to catalog
          if (it.addToCatalog && it.name.trim()) {
            addProduct(it.name.trim(), it.unit, parseMoney(it.unit_price));
          }
          return {
            name: it.name.trim(),
            unit: it.unit || 'dona',
            quantity: parseFloat(it.quantity) || 1,
            unit_price: parseMoney(it.unit_price)
          };
        });
      }

      let resultSale;
      if (correctSaleId) {
        resultSale = await correctSale({
          old_sale_id: correctSaleId,
          client_id: clientId,
          sale_date: saleDate,
          items: formattedItems,
          discount,
          paid_now: paidNow,
          payment_method: paymentMethod,
          due_date: dueDate || null,
          note: note.trim() || null
        });
      } else {
        resultSale = await createSale({
          client_id: clientId,
          sale_date: saleDate,
          items: formattedItems,
          discount,
          paid_now: paidNow,
          payment_method: paymentMethod,
          due_date: dueDate || null,
          note: note.trim() || null
        });
      }

      setSavedSuccess({
        number: resultSale.number,
        total: resultSale.total,
        clientId
      });
    } catch (err: any) {
      alert(err.message || "Xatolik yuz berdi");
    } finally {
      setIsSaving(false);
    }
  };

  // Success view
  if (savedSuccess) {
    return (
      <div className="max-w-md mx-auto w-full px-4 py-16 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {t('sales.success_title')}
          </h2>
          <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
            Savdo №{savedSuccess.number ?? ''} — {formatMoney(savedSuccess.total)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4">
          <button
            onClick={() => {
              setSavedSuccess(null);
              setQuickAmount('');
              setQuickTitle('');
              setPaidNowStr('0');
              setItems([{ id: '1', name: '', quantity: '1', unit: 'dona', unit_price: '', addToCatalog: false }]);
            }}
            className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"
          >
            {t('sales.another_sale')}
          </button>

          <Link
            to={`/clients/${savedSuccess.clientId}`}
            className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center"
          >
            {t('sales.to_client_page')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
            {correctSaleId ? "Savdoni tuzatish" : t('sales.title')}
          </h1>
        </div>

        {/* Mode switcher: Tovarlar bilan / Tez yozish */}
        <div className="bg-slate-200 dark:bg-slate-800 p-1 rounded-xl flex items-center text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('items')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              mode === 'items' ? 'bg-white dark:bg-slate-900 text-blue-600 font-bold shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{t('sales.mode_items')}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('quick')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              mode === 'quick' ? 'bg-white dark:bg-slate-900 text-blue-600 font-bold shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{t('sales.mode_quick')}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Client Picker */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('sales.client')} *
            </label>
            <button
              type="button"
              onClick={() => setIsClientModalOpen(true)}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t('sales.add_new_client')}</span>
            </button>
          </div>

          {selectedClient ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-900/50">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {selectedClient.full_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedClient.shop_name || selectedClient.market} • {selectedClient.phone}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Hozirgi qarzi</span>
                  <span className={`text-xs font-bold font-tabular ${
                    currentClientBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {formatMoney(currentClientBalance)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setClientId('')}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 underline"
                >
                  O'zgartirish
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={clientSearchQuery}
                onChange={(e) => setClientSearchQuery(e.target.value)}
                placeholder="Mijoz qidirish (ism, bozor, telefon)..."
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
        </div>

        {/* Sale Items Section */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          {mode === 'quick' ? (
            /* Quick Mode ("Tez yozish") */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nima oldi?
                </label>
                <input
                  type="text"
                  required
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  placeholder={t('sales.quick_item_placeholder')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {t('common.amount')} (so'm) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={formatNumberWithSpaces(quickAmount)}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-lg font-bold font-tabular text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            /* Items Mode ("Tovarlar bilan") */
            <div className="space-y-3">
              {items.map((row, idx) => {
                const q = parseFloat(row.quantity) || 0;
                const p = parseMoney(row.unit_price);
                const lineTotal = calculateLineTotal(q, p);

                return (
                  <div key={row.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          list="products-datalist"
                          value={row.name}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          placeholder="Tovar nomi (masalan: Un 1-nav)"
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(row.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      {/* Quantity */}
                      <div className="col-span-4">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Miqdor</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={row.quantity}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].quantity = e.target.value;
                            setItems(newItems);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-tabular focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Unit */}
                      <div className="col-span-3">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Birlik</label>
                        <select
                          value={row.unit}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].unit = e.target.value;
                            setItems(newItems);
                          }}
                          className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                        >
                          {['dona', 'kg', 'tonna', 'qop', 'quti', 'pachka', 'blok', 'litr', 'metr'].map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-5">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Narx</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          value={formatNumberWithSpaces(row.unit_price)}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].unit_price = e.target.value;
                            setItems(newItems);
                          }}
                          placeholder="Narx"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-tabular focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={row.addToCatalog}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[idx].addToCatalog = e.target.checked;
                            setItems(newItems);
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span>{t('sales.add_to_catalog')}</span>
                      </label>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 mr-1.5">Jami:</span>
                        <span className="text-xs font-bold font-tabular text-slate-900 dark:text-white">
                          {formatMoney(lineTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleAddItemRow}
                className="w-full py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {t('sales.add_row')}
              </button>

              <datalist id="products-datalist">
                {products.filter(p => p.is_active).map(p => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
          )}

          {/* Subtotal & Discount */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{t('sales.subtotal')}:</span>
              <span className="font-bold font-tabular text-slate-900 dark:text-white text-sm">
                {formatMoney(subtotal)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">{t('sales.discount')}:</span>
              <div className="w-32">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumberWithSpaces(discountStr)}
                  onChange={(e) => setDiscountStr(e.target.value)}
                  placeholder="0"
                  className="w-full px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-right font-tabular focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm font-extrabold text-slate-900 dark:text-white pt-1">
              <span>{t('sales.payable_total')}:</span>
              <span className="text-base font-tabular text-blue-600 dark:text-blue-400">
                {formatMoney(payableTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment & Due Date */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          {/* Paid Now */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t('sales.paid_now')}
              </label>

              {/* Chips: To'liq, 0 */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaidNowStr(String(payableTotal))}
                  className="px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-bold"
                >
                  {t('sales.paid_full')}
                </button>
                <button
                  type="button"
                  onClick={() => setPaidNowStr('0')}
                  className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  0
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={formatNumberWithSpaces(paidNowStr)}
                onChange={(e) => setPaidNowStr(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold font-tabular text-emerald-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none"
              >
                <option value="naqd">Naqd</option>
                <option value="karta">Karta</option>
                <option value="otkazma">O'tkazma</option>
                <option value="click">Click</option>
                <option value="payme">Payme</option>
                <option value="boshqa">Boshqa</option>
              </select>
            </div>

            {isExcessPaid && (
              <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1.5 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{t('sales.excess_paid_notice')}</span>
              </p>
            )}
          </div>

          {/* Live Remaining & Total Client Debt */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">{t('sales.remains_debt')}:</span>
              <span className="font-bold font-tabular text-rose-600 dark:text-rose-400">
                {formatMoney(remainsDebt)}
              </span>
            </div>

            <div className="flex justify-between text-xs pt-1 border-t border-slate-200/50 dark:border-slate-700/50 font-bold">
              <span className="text-slate-700 dark:text-slate-200">{t('sales.client_total_debt')}:</span>
              <span className="font-tabular text-slate-900 dark:text-white">
                {formatMoney(clientNewTotalDebt)}
              </span>
            </div>
          </div>

          {/* Payment Due Date & Chips */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {t('sales.due_date')}
              </label>

              {/* Due Date Chips: +7, +15, +30 */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDueDate(addDaysToDate(saleDate, 7))}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {t('sales.due_in_7')}
                </button>
                <button
                  type="button"
                  onClick={() => setDueDate(addDaysToDate(saleDate, 15))}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {t('sales.due_in_15')}
                </button>
                <button
                  type="button"
                  onClick={() => setDueDate(addDaysToDate(saleDate, 30))}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {t('sales.due_in_30')}
                </button>
              </div>
            </div>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
            />
          </div>

          {/* Sale Date & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('sales.sale_date')}
              </label>
              <input
                type="date"
                required
                max={getTodayDateString()}
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
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
                placeholder="Qo'shimcha izoh..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSaving || !clientId || subtotal <= 0}
          className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-xl shadow-blue-600/30 transition-all disabled:opacity-50 active:scale-[0.99]"
        >
          {isSaving ? t('common.saving') : t('common.save')}
        </button>
      </form>

      {/* Modal for new client */}
      {isClientModalOpen && (
        <ClientFormModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          onSuccess={(c) => {
            setClientId(c.id);
            setIsClientModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
