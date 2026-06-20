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

// Product identity only — stock and expiry now live on lots.
export const CreateItemSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(255),
  description: z.string().max(1000).optional(),
  category_id: optionalUuid('Categoría inválida'),
  supplier_id: optionalUuid('Proveedor inválido'),
  unit: z.string().min(1, 'La unidad es requerida').max(50),
  // numeric, fractional allowed (medicines sold by fraction)
  min_quantity: z.number().min(0, 'El mínimo no puede ser negativo'),
  max_quantity: z.number().min(0).optional(),
  unit_price: z.number().min(0, 'El precio no puede ser negativo').optional(),
  location: z.string().max(255).optional(),
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
  quantity: z.number().min(0, 'La cantidad no puede ser negativa'),
  unit_cost: z.number().min(0, 'El costo no puede ser negativo'),
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
  quantity: z.number().min(0.001, 'La cantidad debe ser mayor a 0'),
  notes: z.string().max(1000).optional(),
});