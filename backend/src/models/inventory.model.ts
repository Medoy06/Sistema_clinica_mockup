import pool from '../config/db';

// --- TYPES ---
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
  created_at: string;
  updated_at: string;
}

export interface CreateItemDTO {
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
}

export interface StockTransactionDTO {
  item_id: string;
  transaction_type: 'purchase' | 'consumption' | 'adjustment' | 'return' | 'expired';
  quantity: number;
  notes?: string;
  performed_by: string;
}

// --- QUERIES ---
export const getAllItems = async () => {
  const result = await pool.query(`
    SELECT 
      i.*,
      c.name as category_name,
      s.name as supplier_name
    FROM inventory_items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    WHERE i.is_active = true
    ORDER BY i.name ASC
  `);
  return result.rows;
};

export const getItemById = async (id: string) => {
  const result = await pool.query(`
    SELECT 
      i.*,
      c.name as category_name,
      s.name as supplier_name
    FROM inventory_items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    WHERE i.id = $1 AND i.is_active = true
  `, [id]);
  return result.rows[0] || null;
};

export const getLowStockItems = async () => {
  const result = await pool.query(`
    SELECT 
      i.*,
      c.name as category_name
    FROM inventory_items i
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE i.quantity <= i.min_quantity AND i.is_active = true
    ORDER BY i.quantity ASC
  `);
  return result.rows;
};

export const createItem = async (data: CreateItemDTO) => {
  const result = await pool.query(`
    INSERT INTO inventory_items (
      name, description, category_id, supplier_id,
      unit, quantity, min_quantity, max_quantity,
      unit_price, location, expiry_date
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
    ) RETURNING *
  `, [
    data.name, data.description, data.category_id, data.supplier_id,
    data.unit, data.quantity, data.min_quantity, data.max_quantity,
    data.unit_price, data.location, data.expiry_date
  ]);
  return result.rows[0];
};

export const updateItem = async (id: string, data: Partial<CreateItemDTO>) => {
  // Whitelist — only these item attributes may be edited here.
  // Excludes: id, created_at, updated_at (never editable),
  //   is_active (soft-delete, handled by deleteItem),
  //   quantity (stock changes ONLY via recordTransaction, to preserve the audit trail).
  const allowedFields = [
    'name', 'description', 'category_id', 'supplier_id', 'unit',
    'min_quantity', 'max_quantity', 'unit_price', 'location', 'expiry_date',
  ];

  const entries = Object.entries(data).filter(([key]) => allowedFields.includes(key));

  if (entries.length === 0) {
    const existing = await pool.query('SELECT * FROM inventory_items WHERE id = $1', [id]);
    return existing.rows[0] || null;
  }

  const fields = entries.map(([key], i) => `${key} = $${i + 2}`).join(', ');
  const values = entries.map(([, value]) => value);

  const result = await pool.query(`
    UPDATE inventory_items
    SET ${fields}, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [id, ...values]);

  return result.rows[0] || null;
};

export const deleteItem = async (id: string) => {
  await pool.query(`
    UPDATE inventory_items
    SET is_active = false, updated_at = NOW()
    WHERE id = $1
  `, [id]);
};

export const recordTransaction = async (data: StockTransactionDTO) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Record the transaction
    await client.query(`
      INSERT INTO inventory_transactions (
        item_id, transaction_type, quantity, notes, performed_by
      ) VALUES ($1, $2, $3, $4, $5)
    `, [data.item_id, data.transaction_type, data.quantity, data.notes, data.performed_by]);

    // Update stock quantity
    const operator = 
      data.transaction_type === 'purchase' || data.transaction_type === 'return'
        ? '+' : '-';

    const result = await client.query(`
      UPDATE inventory_items
      SET quantity = quantity ${operator} $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [data.quantity, data.item_id]);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getItemTransactions = async (item_id: string) => {
  const result = await pool.query(`
    SELECT * FROM inventory_transactions
    WHERE item_id = $1
    ORDER BY created_at DESC
  `, [item_id]);
  return result.rows;
};

export const getAllCategories = async () => {
  const result = await pool.query(`
    SELECT * FROM categories ORDER BY name ASC
  `);
  return result.rows;
};

export const getAllSuppliers = async () => {
  const result = await pool.query(`
    SELECT * FROM suppliers ORDER BY name ASC
  `);
  return result.rows;
};
