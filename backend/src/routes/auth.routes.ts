import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { LoginSchema, CreateUserSchema } from '../models/auth.schema';

const router = Router();

router.post('/login', validate(LoginSchema), AuthController.login);
router.get('/me', authenticate, AuthController.getMe);
router.post('/users', authenticate, authorize('admin'), validate(CreateUserSchema), AuthController.createUser);

export default router;
