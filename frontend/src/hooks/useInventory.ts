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

  // Create a product (identity only). A newly created product has no lots
  // yet, so we refetch to keep computed totals/low-stock consistent.
  const createItem = async (data: Parameters<typeof inventoryService.create>[0]) => {
    const newItem = await inventoryService.create(data);
    await fetchAll();
    return newItem;
  };

  const updateItem = async (
    id: string,
    data: Partial<Parameters<typeof inventoryService.create>[0]>
  ) => {
    const updated = await inventoryService.update(id, data);
    await fetchAll();
    return updated;
  };

  const deleteItem = async (id: string) => {
    await inventoryService.delete(id);
    setItems(prev => prev.filter(item => item.id !== id));
    setLowStockItems(prev => prev.filter(item => item.id !== id));
  };

  // --- Lots ---
  const getLots = async (itemId: string) => {
    return inventoryService.getLots(itemId);
  };

  // Adding a lot changes a product's computed stock, so refetch after.
  const createLot = async (data: Parameters<typeof inventoryService.createLot>[0]) => {
    const lot = await inventoryService.createLot(data);
    await fetchAll();
    return lot;
  };

  // A movement targets a lot and returns the updated LOT (not the item).
  // Stock totals change, so refetch to refresh the item list.
  const addTransaction = async (
    data: Parameters<typeof inventoryService.recordTransaction>[0]
  ) => {
    const lot = await inventoryService.recordTransaction(data);
    await fetchAll();
    return lot;
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
    getLots,
    createLot,
    addTransaction,
  };
};