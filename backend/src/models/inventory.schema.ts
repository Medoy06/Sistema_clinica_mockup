import { z } from 'zod';

export const CreateItemSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(255),
  description: z.string().max(1000).optional(),
  category_id: z.string().uuid('Categoría inválida').optional(),
  supplier_id: z.string().uuid('Proveedor inválido').optional(),
  unit: z.string().min(1, 'La unidad es requerida').max(50),
  quantity: z.number().int().min(0, 'La cantidad no puede ser negativa'),
  min_quantity: z.number().int().min(0, 'El mínimo no puede ser negativo'),
  max_quantity: z.number().int().min(0).optional(),
  unit_price: z.number().min(0, 'El precio no puede ser negativo').optional(),
  location: z.string().max(255).optional(),
  expiry_date: z.string().optional(),
});

export const UpdateItemSchema = CreateItemSchema.partial();

export const TransactionSchema = z.object({
  item_id: z.string().uuid('ID de artículo inválido'),
  transaction_type: z.enum(
  ['purchase', 'consumption', 'adjustment', 'return', 'expired'],
  { errorMap: () => ({ message: 'Tipo de transacción inválido' }) }
),
  quantity: z.number().int().min(1, 'La cantidad debe ser mayor a 0'),
  notes: z.string().max(1000).optional(),
  performed_by: z.string().min(1, 'El responsable es requerido'),
});
