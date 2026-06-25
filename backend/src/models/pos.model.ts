import pool from '../config/db';

const ISV_RATE = 0.15; // Honduras ISV 15%

// --- TYPES ---
// What the client (POS screen) sends: just products and quantities.
// The cashier never picks lots — the server does FEFO. No prices sent
// either; the server reads the authoritative price from the product,
// so the client can't tamper with what things cost.
export interface CartLineDTO {
  item_id: string;
  quantity: number;
}

export interface PaymentDTO {
  method: 'cash' | 'card' | 'credit' | 'transfer';
  amount: number;
  amount_tendered?: number;
  change_given?: number;
  reference?: string;
}

export interface CreateSaleDTO {
  cashier_id: string;
  patient_id?: string;
  cart: CartLineDTO[];
  payments: PaymentDTO[];
  discount_amount?: number;
  notes?: string;
}

// Custom error so the controller can map insufficient-stock to a clean
// 400 with a useful Spanish message, distinct from a real server error.
export class SaleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaleError';
  }
}

// --- CREATE SALE (the core POS transaction) ---
export const createSale = async (data: CreateSaleDTO) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (!data.cart || data.cart.length === 0) {
      throw new SaleError('La venta no tiene productos.');
    }

    let subtotal = 0;
    let isvGravable = 0;
    let isvExento = 0;
    let isvAmount = 0;

    // Collected sale_item rows to insert after we know the sale id.
    const saleItemRows: {
      item_id: string;
      item_name: string;
      lot_id: string;
      lot_number: string;
      quantity: number;
      unit_price: number;
      unit_cost: number;
      line_total: number;
      is_exempt: boolean;
      isv_amount: number;
    }[] = [];

    // --- Walk each cart line, drawing stock FEFO across lots ---
    for (const line of data.cart) {
      if (line.quantity <= 0) {
        throw new SaleError('Cantidad inválida en un producto.');
      }

      // Read the product: authoritative price + exempt status + scope.
      const itemResult = await client.query(
        `SELECT id, name, unit_price, is_exempt, scope
         FROM inventory_items
         WHERE id = $1 AND is_active = true`,
        [line.item_id]
      );
      const item = itemResult.rows[0];
      if (!item) {
        throw new SaleError('Producto no encontrado o inactivo.');
      }
      // Only pharmacy-scope items are sellable. Hospital-scope stock
      // (equipment, ward supplies) can never be rung up, even if its id is
      // forced into the cart by a hand-crafted request.
      if (item.scope !== 'pharmacy') {
        throw new SaleError('Este producto no se puede vender en el punto de venta.');
      }
      const unitPrice = Number(item.unit_price);
      const isExempt = item.is_exempt;

      // Lots in FEFO order. FOR UPDATE locks these rows for the duration
      // of the transaction so two concurrent sales can't oversell the
      // same lot (the classic race condition in POS systems).
      const lotsResult = await client.query(
        `SELECT id, lot_number, quantity, unit_cost
         FROM inventory_lots
         WHERE item_id = $1 AND is_active = true AND quantity > 0
         ORDER BY expiry_date ASC NULLS LAST, created_at ASC
         FOR UPDATE`,
        [line.item_id]
      );

      let remaining = Number(line.quantity);

      for (const lot of lotsResult.rows) {
        if (remaining <= 0) break;

        const lotQty = Number(lot.quantity);
        const take = Math.min(lotQty, remaining); // how much we pull from THIS lot

        // Decrement the lot.
        await client.query(
          `UPDATE inventory_lots
           SET quantity = quantity - $1, updated_at = NOW()
           WHERE id = $2`,
          [take, lot.id]
        );

        // Audit row — stock movements ALWAYS leave a trail (consumption = sale).
        await client.query(
          `INSERT INTO inventory_transactions
             (item_id, lot_id, transaction_type, quantity, notes, performed_by)
           VALUES ($1, $2, 'consumption', $3, 'Venta', $4)`,
          [line.item_id, lot.id, take, data.cashier_id]
        );

        // Money for this slice.
        const lineTotal = +(take * unitPrice).toFixed(2);
        const lineIsv = isExempt ? 0 : +(lineTotal * ISV_RATE).toFixed(2);

        subtotal += lineTotal;
        if (isExempt) {
          isvExento += lineTotal;
        } else {
          isvGravable += lineTotal;
          isvAmount += lineIsv;
        }

        saleItemRows.push({
          item_id: line.item_id,
          item_name: item.name,
          lot_id: lot.id,
          lot_number: lot.lot_number,
          quantity: take,
          unit_price: unitPrice,
          unit_cost: Number(lot.unit_cost),
          line_total: lineTotal,
          is_exempt: isExempt,
          isv_amount: lineIsv,
        });

        remaining = +(remaining - take).toFixed(3);
      }

      // Couldn't fully satisfy this line from available stock → reject whole sale.
      if (remaining > 0) {
        throw new SaleError(
          `Stock insuficiente para "${item.name}". Faltan ${remaining} unidades.`
        );
      }
    }

    // --- Totals ---
    const discount = data.discount_amount ? Number(data.discount_amount) : 0;
    subtotal = +subtotal.toFixed(2);
    isvGravable = +isvGravable.toFixed(2);
    isvExento = +isvExento.toFixed(2);
    isvAmount = +isvAmount.toFixed(2);

    // SECURITY: a discount must never exceed the pre-discount total, or the
    // sale total goes negative — and since the payment check below is
    // (paid < total), a negative total makes ANY payment (even 0) "cover" it.
    // That let a crafted request ring up stock, pay nothing, and record the
    // store as OWING money. A discount larger than the sale is never valid →
    // reject it outright rather than silently clamp (surfaces client bugs/abuse).
    const preDiscountTotal = +(subtotal + isvAmount).toFixed(2);
    if (discount > preDiscountTotal) {
      throw new SaleError('El descuento no puede ser mayor que el total de la venta.');
    }

    const total = +(preDiscountTotal - discount).toFixed(2);

    // --- Validate payments cover the total ---
    const paid = data.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (+paid.toFixed(2) < total) {
      throw new SaleError('El pago no cubre el total de la venta.');
    }

    // --- Insert the sale header ---
    // Fiscal columns intentionally left null — real CAI / sequential
    // numbering is BLOCKED pending client SAR authorization. is_fiscal
    // stays false until a real invoice is emitted.
    const saleResult = await client.query(
      `INSERT INTO sales
         (cashier_id, patient_id, subtotal, isv_gravable, isv_exento,
          isv_amount, discount_amount, total, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', $9)
       RETURNING *`,
      [
        data.cashier_id, data.patient_id || null, subtotal, isvGravable,
        isvExento, isvAmount, discount, total, data.notes || null,
      ]
    );
    const sale = saleResult.rows[0];

    // --- Insert sale_items (capture inserted rows for the receipt) ---
    const insertedItems = [];
    for (const row of saleItemRows) {
      const itemResult = await client.query(
        `INSERT INTO sale_items
           (sale_id, item_id, lot_id, quantity, unit_price, unit_cost,
            line_total, is_exempt, isv_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          sale.id, row.item_id, row.lot_id, row.quantity, row.unit_price,
          row.unit_cost, row.line_total, row.is_exempt, row.isv_amount,
        ]
      );
      // Enrich with the display names we already hold in memory.
      insertedItems.push({
        ...itemResult.rows[0],
        item_name: row.item_name,
        lot_number: row.lot_number,
      });
    }

    // --- Insert payments (capture inserted rows for the receipt) ---
    const insertedPayments = [];
    for (const p of data.payments) {
      const payResult = await client.query(
        `INSERT INTO payments
           (sale_id, method, amount, amount_tendered, change_given, reference)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          sale.id, p.method, p.amount, p.amount_tendered || null,
          p.change_given || null, p.reference || null,
        ]
      );
      insertedPayments.push(payResult.rows[0]);
    }

    await client.query('COMMIT');

    // Build the receipt entirely from data we already have — no post-commit
    // read-back query, so a successful sale can never report failure.
    return {
      ...sale,
      items: insertedItems,
      payments: insertedPayments,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// --- READ ---
export const getSaleById = async (id: string) => {
  const saleResult = await pool.query(
    `SELECT s.*, u.full_name AS cashier_name, p.first_name AS patient_first_name,
            p.last_name AS patient_last_name
     FROM sales s
     LEFT JOIN users u ON s.cashier_id = u.id
     LEFT JOIN patients p ON s.patient_id = p.id
     WHERE s.id = $1`,
    [id]
  );
  const sale = saleResult.rows[0];
  if (!sale) return null;

  const itemsResult = await pool.query(
    `SELECT si.*, i.name AS item_name, l.lot_number
     FROM sale_items si
     LEFT JOIN inventory_items i ON si.item_id = i.id
     LEFT JOIN inventory_lots l ON si.lot_id = l.id
     WHERE si.sale_id = $1
     ORDER BY si.created_at ASC`,
    [id]
  );

  const paymentsResult = await pool.query(
    `SELECT * FROM payments WHERE sale_id = $1 ORDER BY created_at ASC`,
    [id]
  );

  return {
    ...sale,
    items: itemsResult.rows,
    payments: paymentsResult.rows,
  };
};

export const getSales = async (limit = 50) => {
  const result = await pool.query(
    `SELECT s.*, u.full_name AS cashier_name
     FROM sales s
     LEFT JOIN users u ON s.cashier_id = u.id
     ORDER BY s.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
};