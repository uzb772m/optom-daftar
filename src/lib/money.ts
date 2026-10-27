/**
 * Optom Daftar Money Rules & Formatting
 * Spetsifikatsiya 6-bo'lim:
 * 1. Butun so'm, kasr yo'q.
 * 2. line_total = round(quantity * unit_price) to whole so'm, half up (2.75 * 12 345 = 33 948.75 -> 33 949).
 * 3. Format: "5 600 000 so'm" (minglik ajratuvchi bo'sh joy).
 */

export function roundHalfUp(num: number): number {
  const sign = num < 0 ? -1 : 1;
  const abs = Math.abs(num);
  // Using epsilon to handle floating point imprecision like 33948.75000000001
  return sign * Math.floor(abs + 0.5);
}

export function calculateLineTotal(quantity: number, unitPrice: number): number {
  if (quantity <= 0 || unitPrice < 0) return 0;
  // Use precise decimal multiplication
  const product = quantity * unitPrice;
  return roundHalfUp(product);
}

export function formatMoney(amount: number | null | undefined, showCurrency = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showCurrency ? "0 so'm" : "0";
  }

  const rounded = roundHalfUp(amount);
  const isNegative = rounded < 0;
  const absVal = Math.abs(rounded);

  // Group digits by 3 with space
  const parts = absVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const formatted = (isNegative ? "-" : "") + parts;

  return showCurrency ? `${formatted} so'm` : formatted;
}

export function parseMoney(val: string | number | null | undefined): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : roundHalfUp(val);
  if (!val) return 0;
  // Strip out spaces, currency suffixes, keep digits and optional leading minus
  const cleaned = val.toString().replace(/[^\d-]/g, '');
  if (!cleaned || cleaned === '-') return 0;
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatNumberWithSpaces(val: string | number): string {
  const num = parseMoney(val);
  if (num === 0 && (val === '' || val === null || val === undefined)) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
