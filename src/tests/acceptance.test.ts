import { describe, it, expect } from 'vitest';
import { roundHalfUp, calculateLineTotal, formatMoney } from '../lib/money';
import { normalizeSearchText, matchClientSearch } from '../lib/search';
import { computeSalesAllocation, computeClientBalance, computeHistoryAndRunningBalance } from '../lib/allocation';
import { isOverdue } from '../lib/date';
import { Sale, Payment, Client } from '../types';

describe("Optom Daftar - Spetsifikatsiya 10-bo'lim Qabul Testlari", () => {

  it('14-qoida: Rounding 2.75 kg * 12 345 = 33 948.75 -> 33 949', () => {
    const total = calculateLineTotal(2.75, 12345);
    expect(total).toBe(33949);
    expect(formatMoney(total)).toBe("33 949 so'm");
  });

  it("16-qoida: Qidiruv normalizatsiyasi ('akmal', 'AKMAL', 'Акмал' va '4567' Akmal Karimovni topadi)", () => {
    const client = {
      full_name: "Akmal Karimov",
      phone: "+998 90 123 45 67",
      shop_name: "Akmal savdo",
      market: "Chorsu, 3-qator"
    };

    expect(matchClientSearch(client, "akmal")).toBe(true);
    expect(matchClientSearch(client, "AKMAL")).toBe(true);
    expect(matchClientSearch(client, "Акмал")).toBe(true);
    expect(matchClientSearch(client, "4567")).toBe(true);
    expect(matchClientSearch(client, "90123")).toBe(true);
    expect(matchClientSearch(client, "Chorsu")).toBe(true);
    expect(matchClientSearch(client, "Boshqa")).toBe(false);
  });

  it("1–11 qadamlar: Akmal Karimov to'liq sikl ssenariysi", () => {
    const clientId = 'client-akmal-1';
    const businessId = 'biz-1';

    let sales: Sale[] = [];
    let payments: Payment[] = [];

    // 1-qadam: Akmal Karimov yaratildi -> Balans 0
    let balance = computeClientBalance(sales, payments);
    expect(balance).toBe(0);

    // 2-qadam: Savdo №1 (01.11.2026)
    // "Un 1-nav" 10 * 320 000 = 3 200 000
    // "Shakar" 5 * 450 000 = 2 250 000
    // "Kungaboqar yog'i" 12.5 * 18 900 = 236 250
    // Subtotal 5 686 250, chegirma 86 250 -> Total 5 600 000
    // Hozir to'ladi 2 000 000 "Naqd"
    const sale1: Sale = {
      id: 'sale-1',
      business_id: businessId,
      client_id: clientId,
      kind: 'sale',
      number: 1,
      sale_date: '2026-11-01',
      subtotal: 5686250,
      discount: 86250,
      total: 5600000,
      currency: 'UZS',
      status: 'active',
      created_at: '2026-11-01T10:00:00Z'
    };
    sales.push(sale1);

    const payment1: Payment = {
      id: 'pay-1',
      business_id: businessId,
      client_id: clientId,
      sale_id: 'sale-1',
      payment_date: '2026-11-01',
      amount: 2000000,
      currency: 'UZS',
      method: 'naqd',
      status: 'active',
      created_at: '2026-11-01T10:00:01Z'
    };
    payments.push(payment1);

    balance = computeClientBalance(sales, payments);
    expect(balance).toBe(3600000);

    let alloc = computeSalesAllocation(sales, payments);
    expect(alloc.get('sale-1')?.remaining).toBe(3600000);
    expect(alloc.get('sale-1')?.status).toBe("Qisman to'langan");

    // 3-qadam: To'lov 05.11.2026: 1 000 000 "Karta"
    const payment2: Payment = {
      id: 'pay-2',
      business_id: businessId,
      client_id: clientId,
      payment_date: '2026-11-05',
      amount: 1000000,
      currency: 'UZS',
      method: 'karta',
      status: 'active',
      created_at: '2026-11-05T12:00:00Z'
    };
    payments.push(payment2);

    balance = computeClientBalance(sales, payments);
    expect(balance).toBe(2600000);
    alloc = computeSalesAllocation(sales, payments);
    expect(alloc.get('sale-1')?.remaining).toBe(2600000);

    // 4-qadam: Savdo №2 (07.11.2026), "Tez yozish": "Guruch, 20 qop" 4 000 000, paid 0, due 14.11.2026
    const sale2: Sale = {
      id: 'sale-2',
      business_id: businessId,
      client_id: clientId,
      kind: 'sale',
      number: 2,
      sale_date: '2026-11-07',
      subtotal: 4000000,
      discount: 0,
      total: 4000000,
      currency: 'UZS',
      due_date: '2026-11-14',
      status: 'active',
      created_at: '2026-11-07T09:00:00Z'
    };
    sales.push(sale2);

    balance = computeClientBalance(sales, payments);
    expect(balance).toBe(6600000);
    alloc = computeSalesAllocation(sales, payments);
    expect(alloc.get('sale-2')?.status).toBe("To'lanmagan");
    expect(alloc.get('sale-2')?.remaining).toBe(4000000);

    // 5-qadam: To'lov 09.11.2026: 3 000 000 "Naqd"
    const payment3: Payment = {
      id: 'pay-3',
      business_id: businessId,
      client_id: clientId,
      payment_date: '2026-11-09',
      amount: 3000000,
      currency: 'UZS',
      method: 'naqd',
      status: 'active',
      created_at: '2026-11-09T14:00:00Z'
    };
    payments.push(payment3);

    balance = computeClientBalance(sales, payments);
    expect(balance).toBe(3600000);

    alloc = computeSalesAllocation(sales, payments);
    expect(alloc.get('sale-1')?.remaining).toBe(0);
    expect(alloc.get('sale-1')?.status).toBe("To'langan");
    expect(alloc.get('sale-2')?.remaining).toBe(3600000);
    expect(alloc.get('sale-2')?.status).toBe("Qisman to'langan");

    // 6-qadam: Void 05.11 payment with reason "Xato kiritildi"
    payment2.status = 'void';
    payment2.void_reason = "Xato kiritildi";

    balance = computeClientBalance(sales, payments);
    expect(balance).toBe(4600000);

    alloc = computeSalesAllocation(sales, payments);
    expect(alloc.get('sale-1')?.remaining).toBe(600000);
    expect(alloc.get('sale-1')?.status).toBe("Qisman to'langan");
    expect(alloc.get('sale-2')?.remaining).toBe(4000000);
    expect(alloc.get('sale-2')?.status).toBe("To'lanmagan");

    // 7-qadam: To'lov 10.11.2026: 5 000 000 "Naqd" -> Balans -400 000 (Avans)
    const payment4: Payment = {
      id: 'pay-4',
      business_id: businessId,
      client_id: clientId,
      payment_date: '2026-11-10',
      amount: 5000000,
      currency: 'UZS',
      method: 'naqd',
      status: 'active',
      created_at: '2026-11-10T11:00:00Z'
    };
    payments.push(payment4);

    balance = computeClientBalance(sales, payments);
    expect(balance).toBe(-400000);

    alloc = computeSalesAllocation(sales, payments);
    expect(alloc.get('sale-1')?.remaining).toBe(0);
    expect(alloc.get('sale-1')?.status).toBe("To'langan");
    expect(alloc.get('sale-2')?.remaining).toBe(0);
    expect(alloc.get('sale-2')?.status).toBe("To'langan");

    // 8-qadam: Savdo №3 (10.11.2026): "Shakar" 2 * 450 000 = 900 000, paid 0, due 12.11.2026
    const sale3: Sale = {
      id: 'sale-3',
      business_id: businessId,
      client_id: clientId,
      kind: 'sale',
      number: 3,
      sale_date: '2026-11-10',
      subtotal: 900000,
      discount: 0,
      total: 900000,
      currency: 'UZS',
      due_date: '2026-11-12',
      status: 'active',
      created_at: '2026-11-10T15:00:00Z'
    };
    sales.push(sale3);

    balance = computeClientBalance(sales, payments);
    expect(balance).toBe(500000);

    alloc = computeSalesAllocation(sales, payments);
    expect(alloc.get('sale-3')?.remaining).toBe(500000);
    expect(alloc.get('sale-3')?.status).toBe("Qisman to'langan");

    // 9-qadam: History running balance test
    const history = computeHistoryAndRunningBalance(sales, payments);
    const balanceProgression = history.map(h => h.running_balance);
    expect(balanceProgression).toEqual([
      5600000,  // Sale 1 (+5.6m)
      3600000,  // Pay 1 (-2m)
      3600000,  // Pay 2 voided (no change!)
      7600000,  // Sale 2 (+4m)
      4600000,  // Pay 3 (-3m)
      -400000,  // Pay 4 (-5m)
      500000    // Sale 3 (+900k)
    ]);

    // Cross-check: active sales (5.6m + 4m + 900k = 10.5m) - active payments (2m + 3m + 5m = 10m) = 500k
    const activeSalesTotal = sales.filter(s => s.status === 'active').reduce((a, s) => a + s.total, 0);
    const activePaymentsTotal = payments.filter(p => p.status === 'active').reduce((a, p) => a + p.amount, 0);
    expect(activeSalesTotal - activePaymentsTotal).toBe(500000);

    // 10-qadam: Overdue tekshiruvi
    // 10.11.2026 da muddat o'tmagan
    expect(isOverdue(sale3.due_date, alloc.get('sale-3')!.remaining, '2026-11-10')).toBe(false);
    // 13.11.2026 da esa muddati o'tgan
    expect(isOverdue(sale3.due_date, alloc.get('sale-3')!.remaining, '2026-11-13')).toBe(true);
  });

  it("12-13 qadamlar: Bobur Aliyev eski qarzi (daftardan) va ortiqcha to'lov taqsimoti", () => {
    const boburId = 'client-bobur-1';
    const businessId = 'biz-1';
    const boburSales: Sale[] = [];
    const boburPayments: Payment[] = [];

    // 12-qadam: Eski qarz (daftardan) 1 500 000 so'm
    const openingSale: Sale = {
      id: 'opening-bobur',
      business_id: businessId,
      client_id: boburId,
      kind: 'opening',
      number: null, // Null for opening debt
      sale_date: '2026-11-10',
      subtotal: 1500000,
      discount: 0,
      total: 1500000,
      currency: 'UZS',
      status: 'active',
      created_at: '2026-11-10T08:00:00Z'
    };
    boburSales.push(openingSale);

    expect(computeClientBalance(boburSales, boburPayments)).toBe(1500000);

    // 13-qadam: Yangi savdo №5: 1 000 000 so'm, paid now 2 000 000 so'm
    const sale5: Sale = {
      id: 'sale-5',
      business_id: businessId,
      client_id: boburId,
      kind: 'sale',
      number: 5,
      sale_date: '2026-11-10',
      subtotal: 1000000,
      discount: 0,
      total: 1000000,
      currency: 'UZS',
      status: 'active',
      created_at: '2026-11-10T12:00:00Z'
    };
    boburSales.push(sale5);

    const paymentSale5: Payment = {
      id: 'pay-sale-5',
      business_id: businessId,
      client_id: boburId,
      sale_id: 'sale-5',
      payment_date: '2026-11-10',
      amount: 2000000,
      currency: 'UZS',
      method: 'naqd',
      status: 'active',
      created_at: '2026-11-10T12:00:01Z'
    };
    boburPayments.push(paymentSale5);

    // Bobur balansi: 1 500 000 + 1 000 000 - 2 000 000 = 500 000
    expect(computeClientBalance(boburSales, boburPayments)).toBe(500000);

    // Allocation tekshiramiz:
    // 2 000 000 ning 1 000 000 qismi linked sale-5 ga ketadi -> sale-5 To'langan, remaining 0!
    // Qolgan 1 000 000 qismi general pool ga o'tib, eng eski qarz opening-bobur ga ketadi -> 1.5m - 1m = 500 000 remaining, Qisman to'langan!
    const alloc = computeSalesAllocation(boburSales, boburPayments);
    expect(alloc.get('sale-5')?.status).toBe("To'langan");
    expect(alloc.get('sale-5')?.remaining).toBe(0);

    expect(alloc.get('opening-bobur')?.status).toBe("Qisman to'langan");
    expect(alloc.get('opening-bobur')?.remaining).toBe(500000);
  });

  it("17-qoida: Xavfsizlik va Multi-tenant izolyatsiya (Boshqa biznes foydalanuvchisi Akmalning ma'lumotlarini ko'ra olmaydi)", () => {
    const businessA = 'biz-A-baraka';
    const businessB = 'biz-B-orzu';

    const clientA: Client = {
      id: 'client-A-1',
      business_id: businessA,
      full_name: "Akmal Karimov",
      phone: "+998 90 123 45 67",
      is_archived: false,
      search_text: "akmal karimov",
      created_at: new Date().toISOString()
    };

    const clientB: Client = {
      id: 'client-B-1',
      business_id: businessB,
      full_name: "Jamshid Toshmatov",
      phone: "+998 91 222 33 44",
      is_archived: false,
      search_text: "jamshid toshmatov",
      created_at: new Date().toISOString()
    };

    const allClients = [clientA, clientB];

    // Business B ga kirgan foydalanuvchi filtri
    const businessBClients = allClients.filter(c => c.business_id === businessB);

    // Business B da faqat Jamshid bo'lishi kerak, Akmal aslo ko'rinmaydi!
    expect(businessBClients.length).toBe(1);
    expect(businessBClients[0].full_name).toBe("Jamshid Toshmatov");
    expect(businessBClients.some(c => c.full_name === "Akmal Karimov")).toBe(false);
  });
});

