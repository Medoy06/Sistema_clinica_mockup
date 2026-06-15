import { Router } from 'express';
import * as PosController from '../controllers/pos.controller';
import { validate } from '../middleware/validate.middleware';
import { CreateSaleSchema } from '../models/pos.schema';

// Note: authenticate is applied at the index.ts level
// (app.use('/api/pos', authenticate, posRoutes)), matching the
// pattern used for inventory/appointments — not inside this file.
const router = Router();

router.get('/', PosController.getSales);
router.get('/:id', PosController.getSale);
router.post('/', validate(CreateSaleSchema), PosController.createSale);

export default router;