import { Router } from 'express';
import * as InventoryController from '../controllers/inventory.controller';
import { validate } from '../middleware/validate.middleware';
import { CreateItemSchema, UpdateItemSchema, TransactionSchema } from '../models/inventory.schema';

const router = Router();

router.get('/categories', InventoryController.getCategories);
router.get('/suppliers', InventoryController.getSuppliers);
router.get('/low-stock', InventoryController.getLowStock);

router.get('/', InventoryController.getItems);
router.get('/:id', InventoryController.getItem);
router.post('/', validate(CreateItemSchema), InventoryController.createItem);
router.put('/:id', validate(UpdateItemSchema), InventoryController.updateItem);
router.delete('/:id', InventoryController.deleteItem);

router.post('/transactions', validate(TransactionSchema), InventoryController.addTransaction);
router.get('/:id/transactions', InventoryController.getTransactions);

export default router;
