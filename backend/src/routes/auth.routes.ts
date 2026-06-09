import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public
router.post('/login', AuthController.login);

// Protected
router.get('/me', authenticate, AuthController.getMe);

// Admin only
router.post(
  '/users',
  authenticate,
  authorize('admin'),
  AuthController.createUser
);

export default router;