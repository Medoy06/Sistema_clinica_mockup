import { Request, Response, NextFunction } from 'express';
import * as PosModel from '../models/pos.model';
import { SaleError } from '../models/pos.model';

// req.user is globally typed as AuthPayload via the declare augmentation
// in auth.middleware.ts — no local interface needed (matches existing controllers).

export const createSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // cashier_id comes from the authenticated user, NEVER the request body.
    const cashier_id = req.user!.userId;

    const sale = await PosModel.createSale({ ...req.body, cashier_id });
    res.status(201).json({ success: true, data: sale });
  } catch (error) {
    // Business-rule failures (insufficient stock, payment too low) -> 400.
    // Everything else -> global handler.
    if (error instanceof SaleError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const getSale = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sale = await PosModel.getSaleById(req.params.id as string);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Venta no encontrada.' });
    }
    res.json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
};

export const getSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sales = await PosModel.getSales();
    res.json({ success: true, data: sales });
  } catch (error) {
    next(error);
  }
};