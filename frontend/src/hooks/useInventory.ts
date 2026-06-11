import { useState, useEffect, useCallback } from 'react';
import { inventoryService } from '../services/inventory.service';
import type { InventoryItem, Category } from '../services/inventory.service';

export const useInventory = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [allItems, lowStock, cats] = await Promise.all([
        inventoryService.getAll(),
        inventoryService.getLowStock(),
        inventoryService.getCategories(),
      ]);
      setItems(allItems);
      setLowStockItems(lowStock);
      setCategories(cats);
      setError(null);
    } catch (err) {
      setError('Error al cargar el inventario');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createItem = async (data: Parameters<typeof inventoryService.create>[0]) => {
    const newItem = await inventoryService.create(data);
    setItems(prev => [...prev, newItem]);
    if (newItem.quantity <= newItem.min_quantity) {
      setLowStockItems(prev => [...prev, newItem]);
    }
    return newItem;
  };

  const deleteItem = async (id: string) => {
    await inventoryService.delete(id);
    setItems(prev => prev.filter(item => item.id !== id));
    setLowStockItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItem = async (id: string, data: Partial<Parameters<typeof inventoryService.create>[0]>) => {
  const updated = await inventoryService.update(id, data);
  setItems(prev => prev.map(item => item.id === id ? updated : item));
  await fetchAll();
  return updated;
};

const addTransaction = async (data: Parameters<typeof inventoryService.recordTransaction>[0]) => {
  const updated = await inventoryService.recordTransaction(data);
  setItems(prev => prev.map(item => item.id === updated.id ? updated : item));
  await fetchAll();
  return updated;
};

return {
  items,
  lowStockItems,
  categories,
  loading,
  error,
  refetch: fetchAll,
  createItem,
  updateItem,
  deleteItem,
  addTransaction,
};
};