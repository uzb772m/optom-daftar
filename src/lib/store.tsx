import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Business, Client, Product, Sale, Payment, SaleItem, 
  ClientBalance, OperationHistoryItem 
} from '../types';
import { computeClientBalance, computeSalesAllocation, computeHistoryAndRunningBalance } from './allocation';
import { buildClientSearchText } from './search';
import { getTodayDateString } from './date';
import { calculateLineTotal } from './money';

interface StoreContextType {
  business: Business;
  clients: Client[];
  products: Product[];
  sales: Sale[];
  payments: Payment[];
  isOffline: boolean;
  
  // Actions
  addClient: (clientData: Partial<Client>, openingDebt?: { amount: number; date: string }) => Promise<Client>;
  updateClient: (id: string, clientData: Partial<Client>) => Promise<void>;
  archiveClient: (id: string, isArchived: boolean) => Promise<void>;
  
  addProduct: (name: string, unit: string, defaultPrice: number) => Promise<Product>;
  
  createSale: (params: {
    client_id: string;
    sale_date: string;
    kind?: 'sale' | 'opening';
    items: { product_id?: string; name: string; unit: string; quantity: number; unit_price: number }[];
    discount?: number;
    paid_now?: number;
    payment_method?: any;
    due_date?: string | null;
    note?: string | null;
    replaces_sale_id?: string | null;
  }) => Promise<Sale>;

  voidSale: (saleId: string, reason: string) => Promise<void>;

  correctSale: (params: {
    old_sale_id: string;
    client_id: string;
    sale_date: string;
    items: { product_id?: string; name: string; unit: string; quantity: number; unit_price: number }[];
    discount?: number;
    paid_now?: number;
    payment_method?: any;
    due_date?: string | null;
    note?: string | null;
  }) => Promise<Sale>;

  createPayment: (params: {
    client_id: string;
    amount: number;
    method: any;
    payment_date: string;
    note?: string | null;
    sale_id?: string | null;
  }) => Promise<Payment>;

  voidPayment: (paymentId: string, reason: string) => Promise<void>;

  resetToDemoData: () => void;
  updateBusinessInfo: (info: Partial<Business>) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

import { useAuth } from './auth';

const STORAGE_PREFIX = 'optom_data_business_';

const INITIAL_DEMO_BUSINESS: Business = {
  id: 'biz-default',
  name: "Baraka Ulgurji Savdo",
  phone: "+998 90 999 88 77",
  address: "Toshkent sh., Qo'yliq bozori 7-blok",
  created_at: new Date().toISOString()
};

const INITIAL_DEMO_PRODUCTS: Product[] = [
  { id: 'prod-1', business_id: 'biz-default', name: 'Un 1-nav (Qozoq)', unit: 'qop', default_price: 320000, is_active: true, created_at: new Date().toISOString() },
  { id: 'prod-2', business_id: 'biz-default', name: 'Shakar (Xorazm)', unit: 'qop', default_price: 450000, is_active: true, created_at: new Date().toISOString() },
  { id: 'prod-3', business_id: 'biz-default', name: "Kungaboqar yog'i (Rossiya)", unit: 'litr', default_price: 18900, is_active: true, created_at: new Date().toISOString() },
  { id: 'prod-4', business_id: 'biz-default', name: 'Guruch (Alanga)', unit: 'qop', default_price: 400000, is_active: true, created_at: new Date().toISOString() },
  { id: 'prod-5', business_id: 'biz-default', name: 'Makaron (Dona)', unit: 'quti', default_price: 125000, is_active: true, created_at: new Date().toISOString() },
  { id: 'prod-6', business_id: 'biz-default', name: 'Tuxum (1-toifa)', unit: 'quti', default_price: 310000, is_active: true, created_at: new Date().toISOString() }
];

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { business: currentAuthBusiness } = useAuth();

  const activeBusiness: Business = currentAuthBusiness || INITIAL_DEMO_BUSINESS;
  const storageKey = STORAGE_PREFIX + activeBusiness.id;

  const [business, setBusiness] = useState<Business>(activeBusiness);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>(INITIAL_DEMO_PRODUCTS);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  // Sync active business whenever auth changes
  useEffect(() => {
    if (currentAuthBusiness) {
      setBusiness(currentAuthBusiness);
    }
  }, [currentAuthBusiness]);

  // Load isolated state for the specific logged-in business
  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.business) setBusiness(parsed.business);
        setClients(parsed.clients || []);
        setProducts(parsed.products || INITIAL_DEMO_PRODUCTS);
        setSales(parsed.sales || []);
        setPayments(parsed.payments || []);
      } catch (e) {
        console.error("Local data parse error", e);
        if (activeBusiness.id === 'biz-default') {
          initDemoData();
        } else {
          setClients([]);
          setSales([]);
          setPayments([]);
        }
      }
    } else {
      // If it's the demo business, seed demo data; otherwise start with clean account!
      if (activeBusiness.id === 'biz-default') {
        initDemoData();
      } else {
        setClients([]);
        setSales([]);
        setPayments([]);
        setProducts(INITIAL_DEMO_PRODUCTS);
      }
    }
  }, [storageKey, activeBusiness.id]);

  // Save to localStorage scoped strictly to this business
  const saveState = (
    b = business,
    c = clients,
    p = products,
    s = sales,
    pay = payments
  ) => {
    localStorage.setItem(storageKey, JSON.stringify({
      business: b,
      clients: c,
      products: p,
      sales: s,
      payments: pay
    }));
  };

  const initDemoData = () => {
    // Akmal Karimov
    const akmalId = 'client-akmal-1';
    const boburId = 'client-bobur-2';
    const sardorId = 'client-sardor-3';

    const demoClients: Client[] = [
      {
        id: akmalId,
        business_id: INITIAL_DEMO_BUSINESS.id,
        full_name: "Akmal Karimov",
        phone: "+998 90 123 45 67",
        shop_name: "Akmal Savdo",
        market: "Chorsu, 3-qator",
        note: "Oziq-ovqat do'koni egasi",
        is_archived: false,
        search_text: buildClientSearchText({ full_name: "Akmal Karimov", phone: "+998 90 123 45 67", shop_name: "Akmal Savdo", market: "Chorsu, 3-qator" }),
        created_at: '2026-11-01T08:00:00Z'
      },
      {
        id: boburId,
        business_id: INITIAL_DEMO_BUSINESS.id,
        full_name: "Bobur Aliyev",
        phone: "+998 93 765 43 21",
        shop_name: "Bobur Market",
        market: "Qo'yliq bozori",
        note: "Ulgurji haridor",
        is_archived: false,
        search_text: buildClientSearchText({ full_name: "Bobur Aliyev", phone: "+998 93 765 43 21", shop_name: "Bobur Market", market: "Qo'yliq bozori" }),
        created_at: '2026-11-02T09:00:00Z'
      },
      {
        id: sardorId,
        business_id: INITIAL_DEMO_BUSINESS.id,
        full_name: "Sardor Rahimov",
        phone: "+998 97 111 22 33",
        shop_name: "Rahimov Savdo",
        market: "Eski shahar",
        note: "Doimiy to'lovchi",
        is_archived: false,
        search_text: buildClientSearchText({ full_name: "Sardor Rahimov", phone: "+998 97 111 22 33", shop_name: "Rahimov Savdo", market: "Eski shahar" }),
        created_at: '2026-11-03T10:00:00Z'
      }
    ];

    // Akmal's operations from specification
    const demoSales: Sale[] = [
      {
        id: 'sale-1',
        business_id: INITIAL_DEMO_BUSINESS.id,
        kind: 'sale',
        number: 1,
        client_id: akmalId,
        sale_date: '2026-11-01',
        subtotal: 5686250,
        discount: 86250,
        total: 5600000,
        currency: 'UZS',
        status: 'active',
        created_at: '2026-11-01T10:00:00Z',
        items: [
          { id: 'item-1', sale_id: 'sale-1', name: 'Un 1-nav', unit: 'qop', quantity: 10, unit_price: 320000, line_total: 3200000 },
          { id: 'item-2', sale_id: 'sale-1', name: 'Shakar', unit: 'qop', quantity: 5, unit_price: 450000, line_total: 2250000 },
          { id: 'item-3', sale_id: 'sale-1', name: "Kungaboqar yog'i", unit: 'litr', quantity: 12.5, unit_price: 18900, line_total: 236250 }
        ]
      },
      {
        id: 'sale-2',
        business_id: INITIAL_DEMO_BUSINESS.id,
        kind: 'sale',
        number: 2,
        client_id: akmalId,
        sale_date: '2026-11-07',
        subtotal: 4000000,
        discount: 0,
        total: 4000000,
        currency: 'UZS',
        due_date: '2026-11-14',
        status: 'active',
        created_at: '2026-11-07T09:00:00Z',
        items: [
          { id: 'item-4', sale_id: 'sale-2', name: 'Guruch, 20 qop', unit: 'dona', quantity: 1, unit_price: 4000000, line_total: 4000000 }
        ]
      },
      {
        id: 'sale-3',
        business_id: INITIAL_DEMO_BUSINESS.id,
        kind: 'sale',
        number: 3,
        client_id: akmalId,
        sale_date: '2026-11-10',
        subtotal: 900000,
        discount: 0,
        total: 900000,
        currency: 'UZS',
        due_date: '2026-11-12',
        status: 'active',
        created_at: '2026-11-10T15:00:00Z',
        items: [
          { id: 'item-5', sale_id: 'sale-3', name: 'Shakar', unit: 'qop', quantity: 2, unit_price: 450000, line_total: 900000 }
        ]
      },
      {
        id: 'sale-opening-bobur',
        business_id: INITIAL_DEMO_BUSINESS.id,
        kind: 'opening',
        number: null,
        client_id: boburId,
        sale_date: '2026-11-10',
        subtotal: 1500000,
        discount: 0,
        total: 1500000,
        currency: 'UZS',
        status: 'active',
        created_at: '2026-11-10T08:00:00Z',
        items: [
          { id: 'item-op', sale_id: 'sale-opening-bobur', name: 'Eski qarz (daftardan)', unit: 'dona', quantity: 1, unit_price: 1500000, line_total: 1500000 }
        ]
      }
    ];

    const demoPayments: Payment[] = [
      {
        id: 'pay-1',
        business_id: INITIAL_DEMO_BUSINESS.id,
        client_id: akmalId,
        sale_id: 'sale-1',
        payment_date: '2026-11-01',
        amount: 2000000,
        currency: 'UZS',
        method: 'naqd',
        status: 'active',
        created_at: '2026-11-01T10:00:01Z'
      },
      {
        id: 'pay-2',
        business_id: INITIAL_DEMO_BUSINESS.id,
        client_id: akmalId,
        payment_date: '2026-11-05',
        amount: 1000000,
        currency: 'UZS',
        method: 'karta',
        status: 'void',
        void_reason: "Xato kiritildi",
        voided_at: '2026-11-09T10:00:00Z',
        created_at: '2026-11-05T12:00:00Z'
      },
      {
        id: 'pay-3',
        business_id: INITIAL_DEMO_BUSINESS.id,
        client_id: akmalId,
        payment_date: '2026-11-09',
        amount: 3000000,
        currency: 'UZS',
        method: 'naqd',
        status: 'active',
        created_at: '2026-11-09T14:00:00Z'
      },
      {
        id: 'pay-4',
        business_id: INITIAL_DEMO_BUSINESS.id,
        client_id: akmalId,
        payment_date: '2026-11-10',
        amount: 5000000,
        currency: 'UZS',
        method: 'naqd',
        status: 'active',
        created_at: '2026-11-10T11:00:00Z'
      }
    ];

    setBusiness(INITIAL_DEMO_BUSINESS);
    setClients(demoClients);
    setProducts(INITIAL_DEMO_PRODUCTS);
    setSales(demoSales);
    setPayments(demoPayments);
    saveState(INITIAL_DEMO_BUSINESS, demoClients, INITIAL_DEMO_PRODUCTS, demoSales, demoPayments);
  };

  const addClient = async (
    clientData: Partial<Client>,
    openingDebt?: { amount: number; date: string }
  ): Promise<Client> => {
    const id = 'client-' + Math.random().toString(36).substring(2, 9);
    const newClient: Client = {
      id,
      business_id: business.id,
      full_name: clientData.full_name || '',
      phone: clientData.phone || '',
      phone2: clientData.phone2 || '',
      shop_name: clientData.shop_name || '',
      market: clientData.market || '',
      note: clientData.note || '',
      is_archived: false,
      search_text: buildClientSearchText({
        full_name: clientData.full_name || '',
        phone: clientData.phone || '',
        phone2: clientData.phone2 || '',
        shop_name: clientData.shop_name || '',
        market: clientData.market || ''
      }),
      created_at: new Date().toISOString()
    };

    let updatedSales = [...sales];

    // If opening debt is specified
    if (openingDebt && openingDebt.amount > 0) {
      const openingSale: Sale = {
        id: 'sale-open-' + Math.random().toString(36).substring(2, 9),
        business_id: business.id,
        kind: 'opening',
        number: null,
        client_id: id,
        sale_date: openingDebt.date || getTodayDateString(),
        subtotal: openingDebt.amount,
        discount: 0,
        total: openingDebt.amount,
        currency: 'UZS',
        status: 'active',
        created_at: new Date().toISOString(),
        items: [
          {
            id: 'item-open-' + Math.random().toString(36).substring(2, 9),
            sale_id: '',
            name: "Eski qarz (daftardan)",
            unit: 'dona',
            quantity: 1,
            unit_price: openingDebt.amount,
            line_total: openingDebt.amount
          }
        ]
      };
      openingSale.items![0].sale_id = openingSale.id;
      updatedSales.push(openingSale);
    }

    const updatedClients = [newClient, ...clients];
    setClients(updatedClients);
    setSales(updatedSales);
    saveState(business, updatedClients, products, updatedSales, payments);

    return newClient;
  };

  const updateClient = async (id: string, clientData: Partial<Client>) => {
    const updated = clients.map(c => {
      if (c.id === id) {
        const merged = { ...c, ...clientData };
        merged.search_text = buildClientSearchText(merged);
        return merged;
      }
      return c;
    });
    setClients(updated);
    saveState(business, updated, products, sales, payments);
  };

  const archiveClient = async (id: string, isArchived: boolean) => {
    const updated = clients.map(c => c.id === id ? { ...c, is_archived: isArchived } : c);
    setClients(updated);
    saveState(business, updated, products, sales, payments);
  };

  const addProduct = async (name: string, unit: string, defaultPrice: number): Promise<Product> => {
    const newProd: Product = {
      id: 'prod-' + Math.random().toString(36).substring(2, 9),
      business_id: business.id,
      name,
      unit: unit || 'dona',
      default_price: defaultPrice || 0,
      is_active: true,
      created_at: new Date().toISOString()
    };
    const updated = [...products, newProd];
    setProducts(updated);
    saveState(business, clients, updated, sales, payments);
    return newProd;
  };

  const getNextSaleNumber = (currentSales: Sale[]): number => {
    const activeSaleNumbers = currentSales
      .filter(s => s.kind === 'sale' && typeof s.number === 'number')
      .map(s => s.number as number);
    if (activeSaleNumbers.length === 0) return 1;
    return Math.max(...activeSaleNumbers) + 1;
  };

  const createSale = async (params: {
    client_id: string;
    sale_date: string;
    kind?: 'sale' | 'opening';
    items: { product_id?: string; name: string; unit: string; quantity: number; unit_price: number }[];
    discount?: number;
    paid_now?: number;
    payment_method?: any;
    due_date?: string | null;
    note?: string | null;
    replaces_sale_id?: string | null;
  }): Promise<Sale> => {
    const kind = params.kind || 'sale';
    const saleId = 'sale-' + Math.random().toString(36).substring(2, 9);
    const saleNumber = kind === 'sale' ? getNextSaleNumber(sales) : null;

    let subtotal = 0;
    const saleItems: SaleItem[] = params.items.map(item => {
      const lineTotal = calculateLineTotal(item.quantity, item.unit_price);
      subtotal += lineTotal;
      return {
        id: 'item-' + Math.random().toString(36).substring(2, 9),
        sale_id: saleId,
        product_id: item.product_id,
        name: item.name,
        unit: item.unit || 'dona',
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: lineTotal
      };
    });

    const discount = params.discount || 0;
    const total = subtotal - discount;

    const newSale: Sale = {
      id: saleId,
      business_id: business.id,
      kind,
      number: saleNumber,
      client_id: params.client_id,
      sale_date: params.sale_date,
      subtotal,
      discount,
      total,
      currency: 'UZS',
      due_date: params.due_date || null,
      note: params.note || null,
      status: 'active',
      replaces_sale_id: params.replaces_sale_id || null,
      created_at: new Date().toISOString(),
      items: saleItems
    };

    let updatedSales = [...sales, newSale];
    let updatedPayments = [...payments];

    // If paid now > 0, create linked payment
    if (params.paid_now && params.paid_now > 0) {
      const newPay: Payment = {
        id: 'pay-' + Math.random().toString(36).substring(2, 9),
        business_id: business.id,
        client_id: params.client_id,
        sale_id: newSale.id,
        payment_date: params.sale_date,
        amount: params.paid_now,
        currency: 'UZS',
        method: params.payment_method || 'naqd',
        note: "Savdo paytida to'langan",
        status: 'active',
        created_at: new Date().toISOString()
      };
      updatedPayments.push(newPay);
    }

    setSales(updatedSales);
    setPayments(updatedPayments);
    saveState(business, clients, products, updatedSales, updatedPayments);

    return newSale;
  };

  const voidSale = async (saleId: string, reason: string) => {
    const nowIso = new Date().toISOString();
    const updatedSales = sales.map(s => {
      if (s.id === saleId) {
        return {
          ...s,
          status: 'void' as const,
          void_reason: reason,
          voided_at: nowIso
        };
      }
      return s;
    });

    // Void linked payments as per specification rule 6.6
    const updatedPayments = payments.map(p => {
      if (p.sale_id === saleId && p.status === 'active') {
        return {
          ...p,
          status: 'void' as const,
          void_reason: `Savdo bekor qilinganligi sababli (${reason})`,
          voided_at: nowIso
        };
      }
      return p;
    });

    setSales(updatedSales);
    setPayments(updatedPayments);
    saveState(business, clients, products, updatedSales, updatedPayments);
  };

  const correctSale = async (params: {
    old_sale_id: string;
    client_id: string;
    sale_date: string;
    items: { product_id?: string; name: string; unit: string; quantity: number; unit_price: number }[];
    discount?: number;
    paid_now?: number;
    payment_method?: any;
    due_date?: string | null;
    note?: string | null;
  }): Promise<Sale> => {
    // Void old sale with reason "Tuzatildi"
    await voidSale(params.old_sale_id, "Tuzatildi");

    // Create new sale linking to replaces_sale_id
    return createSale({
      ...params,
      replaces_sale_id: params.old_sale_id
    });
  };

  const createPayment = async (params: {
    client_id: string;
    amount: number;
    method: any;
    payment_date: string;
    note?: string | null;
    sale_id?: string | null;
  }): Promise<Payment> => {
    const newPay: Payment = {
      id: 'pay-' + Math.random().toString(36).substring(2, 9),
      business_id: business.id,
      client_id: params.client_id,
      sale_id: params.sale_id || null,
      payment_date: params.payment_date,
      amount: params.amount,
      currency: 'UZS',
      method: params.method || 'naqd',
      note: params.note || null,
      status: 'active',
      created_at: new Date().toISOString()
    };

    const updated = [...payments, newPay];
    setPayments(updated);
    saveState(business, clients, products, sales, updated);
    return newPay;
  };

  const voidPayment = async (paymentId: string, reason: string) => {
    const updated = payments.map(p => {
      if (p.id === paymentId) {
        return {
          ...p,
          status: 'void' as const,
          void_reason: reason,
          voided_at: new Date().toISOString()
        };
      }
      return p;
    });
    setPayments(updated);
    saveState(business, clients, products, sales, updated);
  };

  const updateBusinessInfo = (info: Partial<Business>) => {
    const updated = { ...business, ...info };
    setBusiness(updated);
    saveState(updated, clients, products, sales, payments);
  };

  return (
    <StoreContext.Provider value={{
      business,
      clients,
      products,
      sales,
      payments,
      isOffline,
      addClient,
      updateClient,
      archiveClient,
      addProduct,
      createSale,
      voidSale,
      correctSale,
      createPayment,
      voidPayment,
      resetToDemoData: initDemoData,
      updateBusinessInfo
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
};
