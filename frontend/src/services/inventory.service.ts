import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Attach token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('clinic_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A product = identity only. `quantity` is computed server-side (SUM of
// lots) and arrives as a number for display. Stock/expiry live on lots now.
export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  supplier_id?: string;
  unit: string;
  quantity: number;        // computed total across lots (display only)
  min_quantity: number;
  max_quantity?: number;
  unit_price?: number;
  location?: string;
  is_exempt: boolean;
  is_active: boolean;
  category_name?: string;
  supplier_name?: string;
  created_at: string;
  updated_at: string;
}

// A lot = a physical batch with its own expiry and cost.
export interface InventoryLot {
  id: string;
  item_id: string;
  lot_number: string;
  expiry_date?: string;
  quantity: number;
  unit_cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

// Create payload = identity only. No quantity/expiry — those come from lots.
export interface CreateItemData {
  name: string;
  description?: string;
  category_id?: string;
  unit: string;
  min_quantity: number;
  max_quantity?: number;
  unit_price?: number;
  location?: string;
  is_exempt?: boolean;
  scope?: 'pharmacy' | 'hospital';
}

export interface CreateLotData {
  item_id: string;
  lot_number?: string;
  expiry_date?: string;
  quantity: number;
  unit_cost: number;
}

export interface TransactionData {
  item_id: string;
  lot_id: string;          // movements now target a specific lot
  transaction_type: 'purchase' | 'consumption' | 'adjustment' | 'return' | 'expired';
  quantity: number;
  notes?: string;
}

export const inventoryService = {
  getAll: async (): Promise<InventoryItem[]> => {
    const res = await api.get('/inventory');
    return res.data.data;
  },

  getLowStock: async (): Promise<InventoryItem[]> => {
    const res = await api.get('/inventory/low-stock');
    return res.data.data;
  },

  getCategories: async (): Promise<Category[]> => {
    const res = await api.get('/inventory/categories');
    return res.data.data;
  },

  create: async (data: CreateItemData): Promise<InventoryItem> => {
    const res = await api.post('/inventory', data);
    return res.data.data;
  },

  update: async (id: string, data: Partial<CreateItemData>): Promise<InventoryItem> => {
    const res = await api.put(`/inventory/${id}`, data);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/inventory/${id}`);
  },

  // --- Lots ---
  getLots: async (itemId: string): Promise<InventoryLot[]> => {
    const res = await api.get(`/inventory/${itemId}/lots`);
    return res.data.data;
  },

  createLot: async (data: CreateLotData): Promise<InventoryLot> => {
    const res = await api.post('/inventory/lots', data);
    return res.data.data;
  },

  // --- Movements (now lot-targeted) ---
  recordTransaction: async (data: TransactionData): Promise<InventoryLot> => {
    const res = await api.post('/inventory/transactions', data);
    return res.data.data;
  },
};