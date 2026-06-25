import { Router } from 'express';
import * as InventoryController from '../controllers/inventory.controller';
import { validate } from '../middleware/validate.middleware';
import { can } from '../middleware/auth.middleware';
import {
  CreateItemSchema,
  UpdateItemSchema,
  TransactionSchema,
  CreateLotSchema,
} from '../models/inventory.schema';

const router = Router();

// Module-level gate: must have inventory access (pharmacy OR hospital).
// Per-item / per-list scope filtering happens in the controller.
router.use(can('inventory_any'));

router.get('/categories', InventoryController.getCategories);
router.get('/suppliers', InventoryController.getSuppliers);
router.get('/low-stock', InventoryController.getLowStock);
router.get('/', InventoryController.getItems);
router.get('/:id', InventoryController.getItem);
router.post('/', validate(CreateItemSchema), InventoryController.createItem);
router.put('/:id', validate(UpdateItemSchema), InventoryController.updateItem);
router.delete('/:id', InventoryController.deleteItem);

// Lots
router.get('/:id/lots', InventoryController.getLots);
router.post('/lots', validate(CreateLotSchema), InventoryController.createLot);

router.post('/transactions', validate(TransactionSchema), InventoryController.addTransaction);
router.get('/:id/transactions', InventoryController.getTransactions);

export default router;