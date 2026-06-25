import { z } from 'zod';

// Optional UUID that tolerates empty strings from form selects/inputs.
// On CREATE, a blank select means "no value" → undefined (field absent).
const optionalUuid = (msg: string) =>
  z.preprocess(
    v => (v === '' || v === null ? undefined : v),
    z.string().uuid(msg).optional()
  );

// Nullable UUID for UPDATE: a blank select means "clear this field" → null,
// which the whitelist update writes as NULL. Distinct from create, where
// blank means "don't set it". This is the optional-vs-nullable distinction:
// undefined = leave alone, null = explicitly empty.
const nullableUuid = (msg: string) =>
  z.preprocess(
    v => (v === '' || v === null ? null : v),
    z.string().uuid(msg).nullable().optional()
  );

// Column limits: quantities are numeric(10,3) → max 9,999,999.999;
// prices are numeric(10,2) → max 99,999,999.99. Bounding here turns an
// oversized number into a clean 400 instead of a Postgres 22003 overflow
// (which would otherwise surface as a 500). MAX_QTY / MAX_PRICE below.
const MAX_QTY = 9_999_999;
const MAX_PRICE = 99_999_999;

// Product identity only — stock and expiry now live on lots.
export const CreateItemSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(255),
  description: z.string().max(1000).optional(),
  category_id: optionalUuid('Categoría inválida'),
  supplier_id: optionalUuid('Proveedor inválido'),
  unit: z.string().min(1, 'La unidad es requerida').max(50),
  // numeric, fractional allowed (medicines sold by fraction)
  min_quantity: z.number().min(0, 'El mínimo no puede ser negativo').max(MAX_QTY, 'Valor demasiado grande'),
  max_quantity: z.number().min(0).max(MAX_QTY, 'Valor demasiado grande').optional(),
  unit_price: z.number().min(0, 'El precio no puede ser negativo').max(MAX_PRICE, 'Precio demasiado grande').optional(),
  location: z.string().max(255).optional(),
  is_exempt: z.boolean().optional(),
  // Custody scope. Controller validates it against the caller's role;
  // included here so Zod doesn't strip it from the body.
  scope: z.enum(['pharmacy', 'hospital']).optional(),
});

// Update inherits create's partial shape, but overrides the UUID fields so
// clearing them sends null (clear) rather than undefined (ignore).
export const UpdateItemSchema = CreateItemSchema.partial().extend({
  category_id: nullableUuid('Categoría inválida'),
  supplier_id: nullableUuid('Proveedor inválido'),
});

// A lot = a physical batch. expiry optional (SIN LOTE stock often has none),
// unit_cost required, quantity fractional.
export const CreateLotSchema = z.object({
  item_id: z.string().uuid('ID de artículo inválido'),
  lot_number: z.string().max(100).optional(),
  expiry_date: z.string().optional(),
  quantity: z.number().min(0, 'La cantidad no puede ser negativa').max(MAX_QTY, 'Cantidad demasiado grande'),
  unit_cost: z.number().min(0, 'El costo no puede ser negativo').max(MAX_PRICE, 'Costo demasiado grande'),
});

// A stock movement now targets a specific lot.
// performed_by is injected server-side from the auth token, not sent by client.
export const TransactionSchema = z.object({
  item_id: z.string().uuid('ID de artículo inválido'),
  lot_id: z.string().uuid('ID de lote inválido'),
  transaction_type: z.enum(
    ['purchase', 'consumption', 'adjustment', 'return', 'expired'],
    { errorMap: () => ({ message: 'Tipo de transacción inválido' }) }
  ),
  quantity: z.number().min(0.001, 'La cantidad debe ser mayor a 0').max(MAX_QTY, 'Cantidad demasiado grande'),
  notes: z.string().max(1000).optional(),
});