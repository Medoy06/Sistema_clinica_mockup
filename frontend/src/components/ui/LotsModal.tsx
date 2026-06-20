import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { inventoryService } from '../../services/inventory.service';
import type { InventoryItem, InventoryLot } from '../../services/inventory.service';

interface LotsModalProps {
  item: InventoryItem | null;
  onClose: () => void;
  onChanged: () => void; // called after a lot is added, so the page can refetch totals
}

const formatExpiry = (dateStr?: string) => {
  if (!dateStr) return 'Sin vencimiento';
  // Date-only, no timezone shift (arrives as YYYY-MM-DD...).
  return dateStr.slice(0, 10);
};

export const LotsModal = ({ item, onClose, onChanged }: LotsModalProps) => {
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    lot_number: '',
    expiry_date: '',
    quantity: 0,
    unit_cost: 0,
  });

  const fetchLots = async (itemId: string) => {
    try {
      setLoading(true);
      const data = await inventoryService.getLots(itemId);
      setLots(data);
    } catch (err) {
      toast.error('Error al cargar los lotes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (item) fetchLots(item.id);
  }, [item]);

  if (!item) return null;

  const handleAddLot = async () => {
    if (form.quantity <= 0) {
      toast.error('La cantidad debe ser mayor a 0.');
      return;
    }
    if (form.unit_cost < 0) {
      toast.error('El costo no puede ser negativo.');
      return;
    }
    try {
      setSubmitting(true);
      await inventoryService.createLot({
        item_id: item.id,
        lot_number: form.lot_number || undefined, // backend defaults to 'SIN LOTE'
        expiry_date: form.expiry_date || undefined,
        quantity: form.quantity,
        unit_cost: form.unit_cost,
      });
      toast.success('Lote agregado correctamente.');
      setForm({ lot_number: '', expiry_date: '', quantity: 0, unit_cost: 0 });
      setShowAdd(false);
      await fetchLots(item.id);
      onChanged(); // refresh page-level stock totals
    } catch (err) {
      toast.error('Error al agregar el lote.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-lg font-semibold text-slate-800">Lotes</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">{item.name}</p>

        {/* Lots list */}
        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Cargando lotes...</p>
        ) : lots.length === 0 ? (
          <div className="bg-slate-50 rounded-lg p-6 text-center mb-4">
            <p className="text-slate-500 text-sm">Este producto no tiene lotes.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {lots.map(lot => (
              <div
                key={lot.id}
                className="border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{lot.lot_number}</p>
                  <p className="text-xs text-slate-500">
                    Vence: {formatExpiry(lot.expiry_date)} · Costo: L. {Number(lot.unit_cost).toFixed(2)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  {Number(lot.quantity)} {item.unit}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Add lot toggle / form */}
        {!showAdd ? (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full border border-dashed border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 rounded-lg py-2 text-sm font-medium transition-colors"
          >
            + Agregar lote
          </button>
        ) : (
          <div className="border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Nuevo lote</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 block mb-1">Número de lote</label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.lot_number}
                  onChange={e => setForm({ ...form, lot_number: e.target.value })}
                  placeholder="SIN LOTE"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 block mb-1">Vencimiento</label>
                <input
                  type="date"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.expiry_date}
                  onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 block mb-1">Cantidad *</label>
                <input
                  type="number"
                  min={0.001}
                  step="any"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 block mb-1">Costo unitario (L) *</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.unit_cost}
                  onChange={e => setForm({ ...form, unit_cost: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleAddLot}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                {submitting ? 'Guardando...' : 'Guardar lote'}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};