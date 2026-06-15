import { z } from 'zod';

// Product identity only — stock and expiry now live on lots.
export const CreateItemSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(255),
  description: z.string().max(1000).optional(),
  category_id: z.string().uuid('Categoría inválida').optional(),
  supplier_id: z.string().uuid('Proveedor inválido').optional(),
  unit: z.string().min(1, 'La unidad es requerida').max(50),
  // numeric, fractional allowed (medicines sold by fraction)
  min_quantity: z.number().min(0, 'El mínimo no puede ser negativo'),
  max_quantity: z.number().min(0).optional(),
  unit_price: z.number().min(0, 'El precio no puede ser negativo').optional(),
  location: z.string().max(255).optional(),
});

export const UpdateItemSchema = CreateItemSchema.partial();

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
export const TransactionSchema = z.object({
  item_id: z.string().uuid('ID de artículo inválido'),
  lot_id: z.string().uuid('ID de lote inválido'),
  transaction_type: z.enum(
    ['purchase', 'consumption', 'adjustment', 'return', 'expired'],
    { errorMap: () => ({ message: 'Tipo de transacción inválido' }) }
  ),
  quantity: z.number().min(0.001, 'La cantidad debe ser mayor a 0'),
  notes: z.string().max(1000).optional(),
  performed_by: z.string().min(1, 'El responsable es requerido'),
});