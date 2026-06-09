import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
});

export interface InventoryItem {
    id: string;
    name: string;
    description?: string;
    category_id?: string;
    supplier_id?: string;
    unit: string;
    quantity: number;
    min_quantity: number;
    max_quantity?: number;
    unit_price?: number;
    location?: string;
    expiry_date?: string;
    is_active: boolean;
    category_name?: string;
    supplier_name?: string;
    created_at: string;
    updated_at: string;
}

export interface Category {
    id: string;
    name: string;
    description?: string;
}

export interface CreateItemData {
    name: string;
    description?: string;
    category_id?: string;
    unit: string;
    quantity: number;
    min_quantity: number;
    unit_price?: number;
    location?: string;
    expiry_date?: string;
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
    await api.delete('/inventory/${id}');
},

recordTransaction: async(data: {
    item_id: string;
    transaction_type: 'purchase' | 'consumption' | 'adjustment' | 'return' | 'expired';
    cuantity: number;
    notes?: string;
    performed_by: string;
}): Promise<InventoryItem> => {
    const res = await api.post('/inventory/transactions', data);
    return res.data.data
},

};

