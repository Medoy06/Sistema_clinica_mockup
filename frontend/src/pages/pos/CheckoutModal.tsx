import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { posService } from '../../services/pos.service';
import type { PosProduct, Sale, PaymentPayload } from '../../services/pos.service';

type PaymentMethod = 'cash' | 'card' | 'credit' | 'transfer';

const methodLabels: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  credit: 'Crédito',
  transfer: 'Transferencia',
};

const formatLempiras = (n: number) =>
  `L. ${n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface CartLine {
  product: PosProduct;
  quantity: number;
}

interface CheckoutModalProps {
  cart: CartLine[];
  total: number;
  onClose: () => void;
  onSuccess: (sale: Sale) => void;
}

export const CheckoutModal = ({ cart, total, onClose, onSuccess }: CheckoutModalProps) => {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [tendered, setTendered] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Change is only meaningful for cash.
  const change = useMemo(() => {
    if (method !== 'cash') return 0;
    const t = parseFloat(tendered);
    if (isNaN(t)) return 0;
    return +(t - total).toFixed(2);
  }, [method, tendered, total]);

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (method === 'cash') {
      const t = parseFloat(tendered);
      return !isNaN(t) && t >= total;
    }
    return true; // non-cash: assume exact amount
  }, [method, tendered, total, submitting]);

  const handleConfirm = async () => {
    const payment: PaymentPayload = { method, amount: total };
    if (method === 'cash') {
      const t = parseFloat(tendered);
      payment.amount_tendered = t;
      payment.change_given = +(t - total).toFixed(2);
    }

    try {
      setSubmitting(true);
      const sale = await posService.createSale({
        cart: cart.map(l => ({ item_id: l.product.id, quantity: l.quantity })),
        payments: [payment],
      });
      onSuccess(sale);
    } catch (err: any) {
      // Surface the backend's Spanish SaleError message if present.
      const msg = err?.response?.data?.message || 'Error al procesar la venta.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Cobrar</h2>

        {/* Total */}
        <div className="bg-slate-50 rounded-lg p-4 mb-4 text-center">
          <p className="text-sm text-slate-500">Total a pagar</p>
          <p className="text-3xl font-bold text-slate-800">{formatLempiras(total)}</p>
        </div>

        {/* Payment method */}
        <label className="text-sm text-slate-600 block mb-1">Método de pago</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(Object.keys(methodLabels) as PaymentMethod[]).map(m => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                method === m
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {methodLabels[m]}
            </button>
          ))}
        </div>

        {/* Cash: tendered + change */}
        {method === 'cash' && (
          <div className="mb-4">
            <label className="text-sm text-slate-600 block mb-1">Efectivo recibido</label>
            <input
              type="number"
              min={0}
              value={tendered}
              onChange={e => setTendered(e.target.value)}
              placeholder="0.00"
              autoFocus
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {tendered !== '' && (
              <div className={`flex justify-between mt-2 text-sm font-medium ${
                change < 0 ? 'text-red-600' : 'text-slate-700'
              }`}>
                <span>Cambio</span>
                <span>{change < 0 ? 'Insuficiente' : formatLempiras(change)}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-2">
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {submitting ? 'Procesando...' : 'Confirmar Venta'}
          </button>
          <button
            onClick={onClose}
            disabled={submitting}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};