import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { inventoryService } from '../../services/inventory.service';
import type { InventoryItem, InventoryLot } from '../../services/inventory.service';

type TxType = 'purchase' | 'consumption' | 'adjustment' | 'return' | 'expired';

interface TransactionModalProps {
  item: InventoryItem | null;
  onSave: (data: {
    item_id: string;
    lot_id: string;
    transaction_type: TxType;
    quantity: number;
    notes?: string;
  }) => Promise<void>;
  onClose: () => void;
}

const transactionTypes: { value: TxType; label: string; description: string }[] = [
  { value: 'purchase', label: 'Compra', description: 'Agregar stock por compra' },
  { value: 'consumption', label: 'Consumo', description: 'Reducir stock por uso' },
  { value: 'adjustment', label: 'Ajuste', description: 'Corrección de inventario' },
  { value: 'return', label: 'Devolución', description: 'Devolución de producto' },
  { value: 'expired', label: 'Vencido', description: 'Producto vencido o dañado' },
];

const formatExpiry = (dateStr?: string) => {
  if (!dateStr) return 'Sin vencimiento';
  // Format date-only, no timezone shift (the date arrives as YYYY-MM-DD...).
  return dateStr.slice(0, 10);
};

export const TransactionModal = ({
  item,
  onSave,
  onClose,
}: TransactionModalProps) => {
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [loadingLots, setLoadingLots] = useState(false);
  const [form, setForm] = useState({
    lot_id: '',
    transaction_type: 'purchase' as TxType,
    quantity: 1,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch this product's lots whenever the modal opens for a new item.
  useEffect(() => {
    if (!item) return;
    const fetchLots = async () => {
      try {
        setLoadingLots(true);
        const data = await inventoryService.getLots(item.id);
        setLots(data);
        // Default to the first lot (FEFO order from the backend).
        setForm(f => ({ ...f, lot_id: data[0]?.id || '' }));
      } catch (err) {
        toast.error('Error al cargar los lotes.');
      } finally {
        setLoadingLots(false);
      }
    };
    fetchLots();
  }, [item]);

  if (!item) return null;

  const handleSave = async () => {
    if (!form.lot_id) {
      toast.error('Seleccione un lote.');
      return;
    }
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
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-slate-800 mb-1">
          Registrar Movimiento
        </h3>
        <p className="text-sm text-slate-500 mb-4">{item.name}</p>

        {/* Current total stock indicator */}
        <div className="bg-slate-50 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-slate-600">Stock total</span>
          <span className="font-semibold text-slate-800">
            {item.quantity} {item.unit}
          </span>
        </div>

        {/* No lots: can't record a movement against nothing */}
        {!loadingLots && lots.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
            Este producto no tiene lotes. Agregue un lote primero desde "Lotes".
          </div>
        ) : (
          <div className="space-y-4">
            {/* Lot selector */}
            <div>
              <label className="text-sm text-slate-600 block mb-1">Lote</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.lot_id}
                onChange={e => setForm({ ...form, lot_id: e.target.value })}
                disabled={loadingLots}
              >
                {lots.map(lot => (
                  <option key={lot.id} value={lot.id}>
                    {lot.lot_number} — {lot.quantity} {item.unit} — vence: {formatExpiry(lot.expiry_date)}
                  </option>
                ))}
              </select>
            </div>

            {/* Movement type */}
            <div>
              <label className="text-sm text-slate-600 block mb-2">
                Tipo de movimiento
              </label>
              <div className="grid grid-cols-1 gap-2">
                {transactionTypes.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setForm({ ...form, transaction_type: type.value })}
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

            {/* Quantity */}
            <div>
              <label className="text-sm text-slate-600 block mb-1">
                Cantidad ({isAddition ? '+' : '-'})
              </label>
              <input
                type="number"
                min={0.001}
                step="any"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
              />
            </div>

            {/* Notes */}
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
        )}

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={submitting || loadingLots || lots.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {submitting ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
};