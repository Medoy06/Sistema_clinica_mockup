import pool from '../config/db';

// --- TYPES ---
export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  supplier_id?: string;
  unit: string;
  min_quantity: number;
  max_quantity?: number;
  unit_price?: number;
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed (not a stored column): SUM of this product's lot quantities.
  quantity?: number;
}

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

export interface CreateItemDTO {
  name: string;
  description?: string;
  category_id?: string;
  supplier_id?: string;
  unit: string;
  min_quantity: number;
  max_quantity?: number;
  unit_price?: number;
  location?: string;
}

export interface CreateLotDTO {
  item_id: string;
  lot_number?: string;
  expiry_date?: string;
  quantity: number;
  unit_cost: number;
}

export interface StockTransactionDTO {
  item_id: string;
  lot_id: string;
  transaction_type: 'purchase' | 'consumption' | 'adjustment' | 'return' | 'expired';
  quantity: number;
  notes?: string;
  performed_by: string;
}

// --- ITEM QUERIES ---
// Total stock is computed from lots, never stored. COALESCE guards the
// zero-lot case (SUM of no rows is NULL, which we surface as 0).
export const getAllItems = async () => {
  const result = await pool.query(`
    SELECT
      i.*,
      c.name as category_name,
      s.name as supplier_name,
      COALESCE(SUM(l.quantity) FILTER (WHERE l.is_active = true), 0) AS quantity
    FROM inventory_items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    LEFT JOIN inventory_lots l ON l.item_id = i.id
    WHERE i.is_active = true
    GROUP BY i.id, c.name, s.name
    ORDER BY i.name ASC
  `);
  return result.rows;
};

export const getItemById = async (id: string) => {
  const result = await pool.query(`
    SELECT
      i.*,
      c.name as category_name,
      s.name as supplier_name,
      COALESCE(SUM(l.quantity) FILTER (WHERE l.is_active = true), 0) AS quantity
    FROM inventory_items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    LEFT JOIN inventory_lots l ON l.item_id = i.id
    WHERE i.id = $1 AND i.is_active = true
    GROUP BY i.id, c.name, s.name
  `, [id]);
  return result.rows[0] || null;
};

// Low stock: computed total vs min_quantity. The aggregate condition must
// live in HAVING (runs after GROUP BY), not WHERE (runs before grouping).
export const getLowStockItems = async () => {
  const result = await pool.query(`
    SELECT
      i.*,
      c.name as category_name,
      COALESCE(SUM(l.quantity) FILTER (WHERE l.is_active = true), 0) AS quantity
    FROM inventory_items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN inventory_lots l ON l.item_id = i.id
    WHERE i.is_active = true
    GROUP BY i.id, c.name
    HAVING COALESCE(SUM(l.quantity) FILTER (WHERE l.is_active = true), 0) <= i.min_quantity
    ORDER BY quantity ASC
  `);
  return result.rows;
};

// Creating a product now = product identity only. Stock arrives separately
// as lots (see createLot). No quantity/expiry here anymore.
export const createItem = async (data: CreateItemDTO) => {
  const result = await pool.query(`
    INSERT INTO inventory_items (
      name, description, category_id, supplier_id,
      unit, min_quantity, max_quantity, unit_price, location
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9
    ) RETURNING *
  `, [
    data.name, data.description, data.category_id, data.supplier_id,
    data.unit, data.min_quantity, data.max_quantity,
    data.unit_price, data.location,
  ]);
  return result.rows[0];
};

export const updateItem = async (id: string, data: Partial<CreateItemDTO>) => {
  // Whitelist — only product-identity attributes may be edited here.
  // Stock/expiry now live on lots; quantity never editable directly.
  const allowedFields = [
    'name', 'description', 'category_id', 'supplier_id', 'unit',
    'min_quantity', 'max_quantity', 'unit_price', 'location',
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

// --- LOT QUERIES ---
export const getLotsByItem = async (item_id: string) => {
  const result = await pool.query(`
    SELECT * FROM inventory_lots
    WHERE item_id = $1 AND is_active = true
    ORDER BY
      expiry_date ASC NULLS LAST,
      created_at ASC
  `, [item_id]);
  return result.rows;
};

export const createLot = async (data: CreateLotDTO) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const lotResult = await client.query(`
      INSERT INTO inventory_lots (item_id, lot_number, expiry_date, quantity, unit_cost)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      data.item_id,
      data.lot_number || 'SIN LOTE',
      data.expiry_date,
      data.quantity,
      data.unit_cost,
    ]);

    const lot = lotResult.rows[0];

    // Receiving stock is a 'purchase' movement, tied to the new lot.
    await client.query(`
      INSERT INTO inventory_transactions (
        item_id, lot_id, transaction_type, quantity, notes, performed_by
      ) VALUES ($1, $2, 'purchase', $3, $4, $5)
    `, [data.item_id, lot.id, data.quantity, 'Lote creado', 'system']);

    await client.query('COMMIT');
    return lot;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// --- TRANSACTIONS ---
// A movement now targets a specific lot. Audit insert + lot quantity update
// happen in one SQL transaction so stock and audit trail can never disagree.
export const recordTransaction = async (data: StockTransactionDTO) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      INSERT INTO inventory_transactions (
        item_id, lot_id, transaction_type, quantity, notes, performed_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [data.item_id, data.lot_id, data.transaction_type, data.quantity, data.notes, data.performed_by]);

    const operator =
      data.transaction_type === 'purchase' || data.transaction_type === 'return'
        ? '+' : '-';

    const result = await client.query(`
      UPDATE inventory_lots
      SET quantity = quantity ${operator} $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [data.quantity, data.lot_id]);

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
    SELECT
      t.*,
      l.lot_number
    FROM inventory_transactions t
    LEFT JOIN inventory_lots l ON t.lot_id = l.id
    WHERE t.item_id = $1
    ORDER BY t.created_at DESC
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
