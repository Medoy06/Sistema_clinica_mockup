import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('clinic_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- TYPES ---

// A product as the POS needs it: identity + computed total stock.
export interface PosProduct {
  id: string;
  name: string;
  unit: string;
  unit_price?: number;
  is_exempt: boolean;
  quantity: number; // computed total across lots
  category_name?: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  item_id: string;
  lot_id: string;
  quantity: string;       // numeric comes back as string from pg
  unit_price: string;
  unit_cost: string;
  line_total: string;
  is_exempt: boolean;
  isv_amount: string;
  item_name: string;
  lot_number: string;
}

export interface Payment {
  id: string;
  sale_id: string;
  method: 'cash' | 'card' | 'credit' | 'transfer';
  amount: string;
  amount_tendered?: string;
  change_given?: string;
  reference?: string;
}

export interface Sale {
  id: string;
  cashier_id: string;
  cashier_name?: string;
  patient_id?: string;
  subtotal: string;
  isv_gravable: string;
  isv_exento: string;
  isv_amount: string;
  discount_amount: string;
  total: string;
  status: string;
  is_fiscal: boolean;
  created_at: string;
  items: SaleItem[];
  payments: Payment[];
}

// What we send to create a sale. cashier_id is injected server-side
// from the auth token, so it's NOT part of this payload.
export interface CartLinePayload {
  item_id: string;
  quantity: number;
}

export interface PaymentPayload {
  method: 'cash' | 'card' | 'credit' | 'transfer';
  amount: number;
  amount_tendered?: number;
  change_given?: number;
  reference?: string;
}

export interface CreateSalePayload {
  patient_id?: string;
  cart: CartLinePayload[];
  payments: PaymentPayload[];
  discount_amount?: number;
  notes?: string;
}

// --- SERVICE ---
export const posService = {
  // Product search reuses the inventory list endpoint (returns computed
  // quantity per product). The POS filters client-side for now.
  getProducts: async (): Promise<PosProduct[]> => {
    const res = await api.get('/inventory');
    return res.data.data;
  },

  createSale: async (data: CreateSalePayload): Promise<Sale> => {
    const res = await api.post('/pos', data);
    return res.data.data;
  },

  getSale: async (id: string): Promise<Sale> => {
    const res = await api.get(`/pos/${id}`);
    return res.data.data;
  },

  getSales: async (): Promise<Sale[]> => {
    const res = await api.get('/pos');
    return res.data.data;
  },
};