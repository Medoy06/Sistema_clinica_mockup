import { useState, useEffect } from 'react';
import type { InventoryItem, Category } from '../../services/inventory.service';

interface EditItemModalProps {
  item: InventoryItem | null;
  categories: Category[];
  onSave: (id: string, data: Partial<InventoryItem>) => Promise<void>;
  onClose: () => void;
}

export const EditItemModal = ({
  item,
  categories,
  onSave,
  onClose,
}: EditItemModalProps) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    category_id: '',
    unit: '',
    min_quantity: 0,
    max_quantity: 0,
    unit_price: 0,
    location: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        description: item.description || '',
        category_id: item.category_id || '',
        unit: item.unit,
        min_quantity: item.min_quantity,
        max_quantity: item.max_quantity || 0,
        unit_price: Number(item.unit_price) || 0,
        location: item.location || '',
      });
    }
  }, [item]);

  if (!item) return null;

 const handleSave = async () => {
    try {
      setSubmitting(true);
      // Coerce numeric fields (numeric columns arrive as strings) and convert
      // empty optional strings to undefined (Zod .uuid().optional() rejects "").
      const payload = {
        name: form.name,
        description: form.description || undefined,
        category_id: form.category_id || undefined,
        unit: form.unit,
        min_quantity: Number(form.min_quantity),
        max_quantity: form.max_quantity ? Number(form.max_quantity) : undefined,
        unit_price: form.unit_price ? Number(form.unit_price) : undefined,
        location: form.location || undefined,
      };
      await onSave(item.id, payload);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Editar Artículo
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-600 block mb-1">Nombre *</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm text-slate-600 block mb-1">Categoría</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.category_id}
              onChange={e => setForm({ ...form, category_id: e.target.value })}
            >
              <option value="">Sin categoría</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600 block mb-1">Unidad *</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.unit}
              onChange={e => setForm({ ...form, unit: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm text-slate-600 block mb-1">Ubicación</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm text-slate-600 block mb-1">Cantidad mínima</label>
            <input
              type="number"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.min_quantity}
              onChange={e => setForm({ ...form, min_quantity: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-sm text-slate-600 block mb-1">Cantidad máxima</label>
            <input
              type="number"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.max_quantity}
              onChange={e => setForm({ ...form, max_quantity: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-sm text-slate-600 block mb-1">Precio unitario (L)</label>
            <input
              type="number"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.unit_price}
              onChange={e => setForm({ ...form, unit_price: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-sm text-slate-600 block mb-1">Descripción</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
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
            {submitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};