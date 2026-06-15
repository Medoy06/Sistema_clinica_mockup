import { z } from 'zod';

const CartLineSchema = z.object({
  item_id: z.string().uuid('ID de producto inválido'),
  quantity: z.number().min(0.001, 'La cantidad debe ser mayor a 0'),
});

const PaymentSchema = z.object({
  method: z.enum(
    ['cash', 'card', 'credit', 'transfer'],
    { errorMap: () => ({ message: 'Método de pago inválido' }) }
  ),
  amount: z.number().min(0, 'El monto no puede ser negativo'),
  amount_tendered: z.number().min(0).optional(),
  change_given: z.number().min(0).optional(),
  reference: z.string().max(100).optional(),
});

export const CreateSaleSchema = z.object({
  // cashier_id is NOT taken from the client — the controller injects it
  // from the authenticated user (req.user). Never trust the client for "who am I".
  patient_id: z.string().uuid('ID de paciente inválido').optional(),
  cart: z.array(CartLineSchema).min(1, 'La venta debe tener al menos un producto'),
  payments: z.array(PaymentSchema).min(1, 'La venta debe tener al menos un pago'),
  discount_amount: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});
