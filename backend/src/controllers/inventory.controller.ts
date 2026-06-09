import { Request, Response } from 'express';
import * as InventoryModel from '../models/inventory.model';

export const getItems = async (req: Request, res: Response) => {
  try {
    const items = await InventoryModel.getAllItems();
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('GET ITEMS ERROR:', error);
    res.status(500).json({ success: false, message: 'Error al obtener inventario' });
  }
};

export const getItem = async (req: Request, res: Response) => {
  try {
   const item = await InventoryModel.getItemById(req.params.id as string);;
    if (!item) {
      return res.status(404).json({ success: false, message: 'Artículo no encontrado' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener artículo' });
  }
};

export const getLowStock = async (req: Request, res: Response) => {
  try {
    const items = await InventoryModel.getLowStockItems();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener artículos con bajo stock' });
  }
};

export const createItem = async (req: Request, res: Response) => {
  try {
    const { name, unit, quantity, min_quantity } = req.body;
    if (!name || !unit || quantity === undefined || min_quantity === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Campos requeridos: nombre, unidad, cantidad, cantidad mínima' 
      });
    }
    const item = await InventoryModel.createItem(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear artículo' });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const item = await InventoryModel.updateItem(req.params.id as string, req.body);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Artículo no encontrado' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar artículo' });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    await InventoryModel.deleteItem(req.params.id as string);
    res.json({ success: true, message: 'Artículo desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar artículo' });
  }
};

export const addTransaction = async (req: Request, res: Response) => {
  try {
    const { item_id, transaction_type, quantity, performed_by } = req.body;
    if (!item_id || !transaction_type || !quantity || !performed_by) {
      return res.status(400).json({ 
        success: false, 
        message: 'Campos requeridos: item_id, tipo, cantidad, realizado_por' 
      });
    }
    const item = await InventoryModel.recordTransaction(req.body);
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al registrar transacción' });
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const transactions = await InventoryModel.getItemTransactions(req.params.id as string);
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener transacciones' });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await InventoryModel.getAllCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('DB ERROR:', error);
    res.status(500).json({ success: false, message: 'Error al obtener categorías' });
  }
};

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await InventoryModel.getAllSuppliers();
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener proveedores' });
  }
};