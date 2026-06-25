import { Router } from 'express';
import * as PosController from '../controllers/pos.controller';
import { validate } from '../middleware/validate.middleware';
import { can } from '../middleware/auth.middleware';
import { CreateSaleSchema } from '../models/pos.schema';

// authenticate is applied at the index.ts level
// (app.use('/api/pos', authenticate, posRoutes)).
const router = Router();

// Module-level gate: only roles that may run the till.
router.use(can('pos'));

router.get('/', PosController.getSales);
router.get('/:id', PosController.getSale);
router.post('/', validate(CreateSaleSchema), PosController.createSale);

export default router;