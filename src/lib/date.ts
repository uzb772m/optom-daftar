/**
 * Date & Time Utilities in Asia/Tashkent (UTC+5)
 */

export function getTashkentNow(): Date {
  // Tashkent is UTC+5 without DST
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 5));
}

export function getTodayDateString(): string {
  const d = getTashkentNow();
  return formatISODate(d);
}

export function formatISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDDMMYYYY(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return typeof dateStr === 'string' ? dateStr : '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatISODate(d);
}

export function getDaysDiff(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function isOverdue(dueDate: string | null | undefined, remainingAmount: number, referenceDateStr?: string): boolean {
  if (!dueDate || remainingAmount <= 0) return false;
  const today = referenceDateStr || getTodayDateString();
  return dueDate < today;
}

export function getDaysOverdue(dueDate: string | null | undefined, referenceDateStr?: string): number {
  if (!dueDate) return 0;
  const today = referenceDateStr || getTodayDateString();
  const diff = getDaysDiff(today, dueDate);
  return diff > 0 ? diff : 0;
}
