import { Request, Response, NextFunction } from 'express';
import * as InventoryModel from '../models/inventory.model';

export const getItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await InventoryModel.getAllItems();
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

export const getItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await InventoryModel.getItemById(req.params.id as string);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Artículo no encontrado' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const getLowStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await InventoryModel.getLowStockItems();
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

// Validation handled by Zod (CreateItemSchema) at the route layer.
export const createItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await InventoryModel.createItem(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const updateItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await InventoryModel.updateItem(req.params.id as string, req.body);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Artículo no encontrado' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const deleteItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await InventoryModel.deleteItem(req.params.id as string);
    res.json({ success: true, message: 'Artículo desactivado correctamente' });
  } catch (error) {
    next(error);
  }
};

// --- LOTS ---
export const getLots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lots = await InventoryModel.getLotsByItem(req.params.id as string);
    res.json({ success: true, data: lots });
  } catch (error) {
    next(error);
  }
};

// Validation handled by Zod (CreateLotSchema) at the route layer.
export const createLot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lot = await InventoryModel.createLot(req.body);
    res.status(201).json({ success: true, data: lot });
  } catch (error) {
    next(error);
  }
};

// --- TRANSACTIONS ---
// Validation handled by Zod (TransactionSchema) at the route layer.
export const addTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await InventoryModel.recordTransaction(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transactions = await InventoryModel.getItemTransactions(req.params.id as string);
    res.json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await InventoryModel.getAllCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

export const getSuppliers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const suppliers = await InventoryModel.getAllSuppliers();
    res.json({ success: true, data: suppliers });
  } catch (error) {
    next(error);
  }
};