import { Request, Response, NextFunction } from 'express';
import * as InventoryModel from '../models/inventory.model';
import { StockError } from '../models/inventory.model';
import { allowedScopesForRole } from '../config/permissions';

// --- Scope guard -------------------------------------------------------
// For any single-item endpoint: fetch the item's scope and verify the
// caller's role is allowed to touch that scope. Returns true if OK; if not,
// it has already sent the response and the caller should return.
// This stops a hand-crafted request (e.g. a pharmacist requesting a known
// hospital-item id) from reading or mutating out-of-scope data.
const scopeGuardOk = async (
  req: Request,
  res: Response,
  itemId: string
): Promise<boolean> => {
  const scope = await InventoryModel.getItemScope(itemId);
  if (scope === null) {
    res.status(404).json({ success: false, message: 'Artículo no encontrado' });
    return false;
  }
  const allowed = allowedScopesForRole(req.user!.role);
  if (!allowed.includes(scope as 'pharmacy' | 'hospital')) {
    // 404 (not 403) on purpose: don't reveal that an item with this id
    // exists in a scope the caller can't see. Avoids an existence-leak.
    res.status(404).json({ success: false, message: 'Artículo no encontrado' });
    return false;
  }
  return true;
};

export const getItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scopes = allowedScopesForRole(req.user!.role);
    const items = await InventoryModel.getAllItems(scopes);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

export const getItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!(await scopeGuardOk(req, res, id))) return;
    const item = await InventoryModel.getItemById(id);
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
    const scopes = allowedScopesForRole(req.user!.role);
    const items = await InventoryModel.getLowStockItems(scopes);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

// Create: the requested scope must be one the caller's role may create in.
export const createItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allowed = allowedScopesForRole(req.user!.role);
    // Default to the caller's only scope if they have exactly one; otherwise
    // require an explicit, allowed scope in the body.
    let scope: string | undefined = req.body.scope;
    if (!scope && allowed.length === 1) scope = allowed[0];
    if (!scope || !allowed.includes(scope as 'pharmacy' | 'hospital')) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para crear artículos en este ámbito.',
      });
    }
    const item = await InventoryModel.createItem({ ...req.body, scope });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const updateItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!(await scopeGuardOk(req, res, id))) return;
    const item = await InventoryModel.updateItem(id, req.body);
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
    const id = req.params.id as string;
    if (!(await scopeGuardOk(req, res, id))) return;
    await InventoryModel.deleteItem(id);
    res.json({ success: true, message: 'Artículo desactivado correctamente' });
  } catch (error) {
    next(error);
  }
};

// --- LOTS ---
export const getLots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!(await scopeGuardOk(req, res, id))) return;
    const lots = await InventoryModel.getLotsByItem(id);
    res.json({ success: true, data: lots });
  } catch (error) {
    next(error);
  }
};

export const createLot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = req.body.item_id as string;
    if (!(await scopeGuardOk(req, res, itemId))) return;
    const lot = await InventoryModel.createLot(req.body);
    res.status(201).json({ success: true, data: lot });
  } catch (error) {
    next(error);
  }
};

// --- TRANSACTIONS ---
// performed_by is injected from the authenticated user, never the client.
export const addTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = req.body.item_id as string;
    if (!(await scopeGuardOk(req, res, itemId))) return;
    const performed_by = req.user!.userId;
    const result = await InventoryModel.recordTransaction({ ...req.body, performed_by });
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof StockError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!(await scopeGuardOk(req, res, id))) return;
    const transactions = await InventoryModel.getItemTransactions(id);
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