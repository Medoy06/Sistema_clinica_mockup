import { Router } from 'express';
import * as InventoryController from '../controllers/inventory.controller';

const router = Router();

// Categories and suppliers
router.get('/categories', InventoryController.getCategories);
router.get('/suppliers', InventoryController.getSuppliers);

// Low stock alert
router.get('/low-stock', InventoryController.getLowStock);

// Item CRUD
router.get('/', InventoryController.getItems);
router.get('/:id', InventoryController.getItem);
router.post('/', InventoryController.createItem);
router.put('/:id', InventoryController.updateItem);
router.delete('/:id', InventoryController.deleteItem);

// Stock transactions
router.post('/transactions', InventoryController.addTransaction);
router.get('/:id/transactions', InventoryController.getTransactions);

export default router;