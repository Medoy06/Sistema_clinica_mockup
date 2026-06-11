import { useState } from 'react';
import type { InventoryItem } from '../../services/inventory.service';

interface TransactionModalProps {
  item: InventoryItem | null;
  onSave: (data: {
    item_id: string;
    transaction_type: 'purchase' | 'consumption' | 'adjustment' | 'return' | 'expired';
    quantity: number;
    notes?: string;
    performed_by: string;
  }) => Promise<void>;
  onClose: () => void;
  currentUser: string;
}

const transactionTypes = [
  { value: 'purchase', label: 'Compra', description: 'Agregar stock por compra' },
  { value: 'consumption', label: 'Consumo', description: 'Reducir stock por uso' },
  { value: 'adjustment', label: 'Ajuste', description: 'Corrección de inventario' },
  { value: 'return', label: 'Devolución', description: 'Devolución de producto' },
  { value: 'expired', label: 'Vencido', description: 'Producto vencido o dañado' },
] as const;

export const TransactionModal = ({
  item,
  onSave,
  onClose,
  currentUser,
}: TransactionModalProps) => {
  const [form, setForm] = useState({
    transaction_type: 'purchase' as const,
    quantity: 1,
    notes: '',
    performed_by: currentUser,
  });
  const [submitting, setSubmitting] = useState(false);

  if (!item) return null;

  const handleSave = async () => {
    try {
      setSubmitting(true);
      await onSave({
        item_id: item.id,
        ...form,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const isAddition = ['purchase', 'return'].includes(form.transaction_type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-1">
          Registrar Movimiento
        </h3>
        <p className="text-sm text-slate-500 mb-4">{item.name}</p>

        {/* Current stock indicator */}
        <div className="bg-slate-50 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-slate-600">Stock actual</span>
          <span className="font-semibold text-slate-800">
            {item.quantity} {item.unit}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-600 block mb-2">
              Tipo de movimiento
            </label>
            <div className="grid grid-cols-1 gap-2">
              {transactionTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => setForm({
                    ...form,
                    transaction_type: type.value as typeof form.transaction_type
                  })}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors
                    ${form.transaction_type === type.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <span className="font-medium">{type.label}</span>
                  <span className="text-slate-400 ml-2">— {type.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-600 block mb-1">
              Cantidad ({isAddition ? '+' : '-'})
            </label>
            <input
              type="number"
              min={1}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.quantity}
              onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="text-sm text-slate-600 block mb-1">
              Notas (opcional)
            </label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Observaciones..."
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {submitting ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
};