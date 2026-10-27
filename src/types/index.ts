export type Currency = 'UZS' | 'USD';

export type UserRole = 'owner' | 'seller';

export interface Business {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export interface Membership {
  id: string;
  business_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface Client {
  id: string;
  business_id: string;
  full_name: string;
  phone: string;
  phone2?: string;
  shop_name?: string;
  market?: string;
  note?: string;
  is_archived: boolean;
  search_text: string;
  created_at: string;
  created_by?: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  unit: string;
  default_price: number;
  is_active: boolean;
  created_at: string;
}

export type SaleKind = 'sale' | 'opening';
export type SaleStatus = 'active' | 'void';
export type SalePaymentStatus = "To'lanmagan" | "Qisman to'langan" | "To'langan";

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id?: string;
  name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Sale {
  id: string;
  business_id: string;
  kind: SaleKind;
  number?: number | null;
  client_id: string;
  sale_date: string; // YYYY-MM-DD
  subtotal: number;
  discount: number;
  total: number;
  currency: Currency;
  due_date?: string | null;
  note?: string | null;
  status: SaleStatus;
  void_reason?: string | null;
  voided_at?: string | null;
  voided_by?: string | null;
  replaces_sale_id?: string | null;
  created_at: string;
  created_by?: string;
  // Computed / expanded fields
  items?: SaleItem[];
  allocated?: number;
  remaining?: number;
  payment_status?: SalePaymentStatus;
}

export type PaymentMethod = 'naqd' | 'karta' | 'otkazma' | 'click' | 'payme' | 'boshqa';
export type PaymentStatus = 'active' | 'void';

export interface Payment {
  id: string;
  business_id: string;
  client_id: string;
  sale_id?: string | null;
  payment_date: string; // YYYY-MM-DD
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  note?: string | null;
  status: PaymentStatus;
  void_reason?: string | null;
  voided_at?: string | null;
  voided_by?: string | null;
  replaces_payment_id?: string | null;
  created_at: string;
  created_by?: string;
}

export interface ClientBalance {
  client_id: string;
  total_sales: number;
  total_payments: number;
  balance: number; // >0 Qarzi (red), <0 Avans (green), ==0 Qarzi yo'q
}

export interface OperationHistoryItem {
  id: string;
  date: string;
  created_at: string;
  type: 'sale' | 'opening' | 'payment';
  number?: number | null;
  title: string;
  amount: number; // positive for sale, positive for payment
  is_payment: boolean;
  status: 'active' | 'void';
  void_reason?: string | null;
  running_balance: number;
  details?: any;
}
