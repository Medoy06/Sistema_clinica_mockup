import { useState } from 'react';
import toast from 'react-hot-toast';
import { useInventory } from '../../hooks/useInventory';
import { useAuth } from '../../context/AuthContext';
import type { InventoryItem } from '../../services/inventory.service';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EditItemModal } from '../../components/ui/EditItemModal';
import { TransactionModal } from '../../components/ui/TransactionModal';

export const InventoryPage = () => {
  const { items, lowStockItems, categories, loading, error, createItem, updateItem, deleteItem, addTransaction } = useInventory();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal state
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [transactionItem, setTransactionItem] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    category_id: '',
    unit: '',
    quantity: 0,
    min_quantity: 0,
    unit_price: 0,
    location: '',
  });

  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!form.name || !form.unit) {
      toast.error('Nombre y unidad son requeridos.');
      return;
    }
    try {
      setSubmitting(true);
      await createItem(form);
      toast.success('Artículo creado correctamente.');
      setShowForm(false);
      setForm({
        name: '', description: '', category_id: '',
        unit: '', quantity: 0, min_quantity: 0,
        unit_price: 0, location: '',
      });
    } catch (err) {
      toast.error('Error al crear el artículo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, data: Partial<InventoryItem>) => {
    try {
      await updateItem(id, data);
      toast.success('Artículo actualizado correctamente.');
    } catch (err) {
      toast.error('Error al actualizar el artículo.');
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteItem(deleteTarget.id);
      toast.success('Artículo eliminado.');
    } catch (err) {
      toast.error('Error al eliminar el artículo.');
    } finally {
      setDeleteTarget(null);
    }
  };

  type TransactionPayload = {
    item_id: string;
    transaction_type: 'purchase' | 'consumption' | 'adjustment' | 'return' | 'expired';
    quantity: number;
    notes?: string;
    performed_by: string;
  };

  const handleTransaction = async (data: TransactionPayload) => {
    try {
      await addTransaction({
        item_id: data.item_id,
        transaction_type: data.transaction_type,
        quantity: data.quantity,
        notes: data.notes,
        performed_by: data.performed_by,
      });
      toast.success('Movimiento registrado correctamente.');
    } catch (err) {
      toast.error('Error al registrar el movimiento.');
      throw err;
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-slate-500">Cargando inventario...</p>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-red-500">{error}</p>
    </div>
  );

  return (
    <div className="p-6">
      {/* Modals */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Eliminar artículo"
        message={`¿Está seguro que desea eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
      <EditItemModal
        item={editItem}
        categories={categories}
        onSave={handleUpdate}
        onClose={() => setEditItem(null)}
      />
      <TransactionModal
        item={transactionItem}
        onSave={handleTransaction}
        onClose={() => setTransactionItem(null)}
        currentUser={user?.full_name || ''}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
          <p className="text-slate-500 text-sm mt-1">
            {items.length} artículos registrados
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nuevo Artículo
        </button>
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-amber-800 font-medium text-sm">
            ⚠️ {lowStockItems.length} artículo(s) con stock bajo:&nbsp;
            {lowStockItems.map(i => i.name).join(', ')}
          </p>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">
            Nuevo Artículo
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600 block mb-1">Nombre *</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Nombre del artículo"
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
                placeholder="caja, unidad, frasco..."
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">Ubicación</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="Estante A, Bodega..."
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">
                Cantidad inicial *
              </label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">
                Cantidad mínima *
              </label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.min_quantity}
                onChange={e => setForm({ ...form, min_quantity: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-1">
                Precio unitario (L)
              </label>
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
                placeholder="Descripción opcional"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          className="w-full max-w-sm border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Buscar artículo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">
                Artículo
              </th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">
                Categoría
              </th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">
                Unidad
              </th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">
                Cantidad
              </th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">
                Mínimo
              </th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">
                Precio (L)
              </th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">
                Estado
              </th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-400">
                  No se encontraron artículos
                </td>
              </tr>
            ) : (
              filtered.map(item => (
                <tr
                  key={item.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{item.name}</p>
                    {item.location && (
                      <p className="text-xs text-slate-400">{item.location}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.category_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.unit}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${
                      item.quantity <= item.min_quantity
                        ? 'text-red-600'
                        : 'text-slate-800'
                    }`}>
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.min_quantity}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.unit_price
                      ? `L ${Number(item.unit_price).toFixed(2)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {item.quantity <= item.min_quantity ? (
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                        Stock bajo
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                        Normal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setTransactionItem(item)}
                        className="text-blue-500 hover:text-blue-700 text-xs transition-colors"
                      >
                        Movimiento
                      </button>
                      <button
                        onClick={() => setEditItem(item)}
                        className="text-slate-500 hover:text-slate-700 text-xs transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="text-red-500 hover:text-red-700 text-xs transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};