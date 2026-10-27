import { Sale, Payment, SalePaymentStatus, OperationHistoryItem } from '../types';

/**
 * Calculates allocation of payments to sales according to Specification Section 6.
 * Recomputed purely from active sales and payments.
 */
export function computeSalesAllocation(
  sales: Sale[],
  payments: Payment[]
): Map<string, { allocated: number; remaining: number; status: SalePaymentStatus }> {
  const result = new Map<string, { allocated: number; remaining: number; status: SalePaymentStatus }>();

  // Only active records count
  const activeSales = sales.filter(s => s.status === 'active');
  const activePayments = payments.filter(p => p.status === 'active');

  // Initialize all active sales
  for (const s of activeSales) {
    result.set(s.id, {
      allocated: 0,
      remaining: s.total,
      status: "To'lanmagan"
    });
  }

  // 1. Linked payments: A payment linked to a sale goes to that sale first, up to its total
  let generalPool = 0;

  for (const p of activePayments) {
    if (p.sale_id && result.has(p.sale_id)) {
      const saleAlloc = result.get(p.sale_id)!;
      const needed = saleAlloc.remaining;
      const directPay = Math.min(p.amount, needed);

      saleAlloc.allocated += directPay;
      saleAlloc.remaining -= directPay;

      const excess = p.amount - directPay;
      if (excess > 0) {
        generalPool += excess;
      }
    } else {
      // Unlinked or linked to non-existing/void sale goes to pool
      generalPool += p.amount;
    }
  }

  // 2. Oldest first filling from the pool
  // Sort active sales oldest first: sale_date ascending, then created_at ascending
  const sortedSales = [...activeSales].sort((a, b) => {
    if (a.sale_date !== b.sale_date) {
      return a.sale_date.localeCompare(b.sale_date);
    }
    return a.created_at.localeCompare(b.created_at);
  });

  for (const s of sortedSales) {
    const saleAlloc = result.get(s.id)!;
    if (saleAlloc.remaining > 0 && generalPool > 0) {
      const fill = Math.min(generalPool, saleAlloc.remaining);
      saleAlloc.allocated += fill;
      saleAlloc.remaining -= fill;
      generalPool -= fill;
    }

    // Determine status
    if (saleAlloc.remaining <= 0) {
      saleAlloc.status = "To'langan";
    } else if (saleAlloc.allocated > 0) {
      saleAlloc.status = "Qisman to'langan";
    } else {
      saleAlloc.status = "To'lanmagan";
    }
  }

  return result;
}

/**
 * Calculates the chronological running balance and history list (Section 6.13)
 * Chronological order: by date, then created_at.
 * If sale and payment have same timestamp/date, sale goes before the payment taken with it.
 */
export function computeHistoryAndRunningBalance(
  sales: Sale[],
  payments: Payment[]
): OperationHistoryItem[] {
  type RawOp = {
    id: string;
    date: string;
    created_at: string;
    is_sale: boolean;
    kind?: string;
    number?: number | null;
    title: string;
    amount: number;
    status: 'active' | 'void';
    void_reason?: string | null;
    linked_sale_id?: string | null;
    raw: Sale | Payment;
  };

  const ops: RawOp[] = [];

  for (const s of sales) {
    ops.push({
      id: s.id,
      date: s.sale_date,
      created_at: s.created_at,
      is_sale: true,
      kind: s.kind,
      number: s.number,
      title: s.kind === 'opening' ? "Eski qarz (daftardan)" : `Savdo №${s.number ?? ''}`,
      amount: s.total,
      status: s.status,
      void_reason: s.void_reason,
      raw: s
    });
  }

  for (const p of payments) {
    ops.push({
      id: p.id,
      date: p.payment_date,
      created_at: p.created_at,
      is_sale: false,
      title: `To'lov (${p.method.toUpperCase()})`,
      amount: p.amount,
      status: p.status,
      void_reason: p.void_reason,
      linked_sale_id: p.sale_id,
      raw: p
    });
  }

  // Sort chronologically (oldest first):
  // date ASC, then sales before their linked payments, then created_at ASC
  ops.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    // If one is payment linked to the other sale, sale comes first
    if (a.is_sale && !b.is_sale && b.linked_sale_id === a.id) {
      return -1;
    }
    if (!a.is_sale && b.is_sale && a.linked_sale_id === b.id) {
      return 1;
    }
    // Sales before payments on same date
    if (a.created_at !== b.created_at) {
      return a.created_at.localeCompare(b.created_at);
    }
    return a.is_sale ? -1 : 1;
  });

  let runningBalance = 0;
  const history: OperationHistoryItem[] = [];

  for (const op of ops) {
    // Only active operations affect running balance
    if (op.status === 'active') {
      if (op.is_sale) {
        runningBalance += op.amount;
      } else {
        runningBalance -= op.amount;
      }
    }

    history.push({
      id: op.id,
      date: op.date,
      created_at: op.created_at,
      type: op.is_sale ? (op.kind === 'opening' ? 'opening' : 'sale') : 'payment',
      number: op.number,
      title: op.title,
      amount: op.amount,
      is_payment: !op.is_sale,
      status: op.status,
      void_reason: op.void_reason,
      running_balance: runningBalance,
      details: op.raw
    });
  }

  return history;
}

export function computeClientBalance(sales: Sale[], payments: Payment[]): number {
  const activeSales = sales.filter(s => s.status === 'active');
  const activePayments = payments.filter(p => p.status === 'active');

  const salesSum = activeSales.reduce((acc, s) => acc + s.total, 0);
  const paymentsSum = activePayments.reduce((acc, p) => acc + p.amount, 0);

  return salesSum - paymentsSum;
}
