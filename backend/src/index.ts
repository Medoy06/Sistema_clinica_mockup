import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import inventoryRoutes from './routes/inventory.routes';
import authRoutes from './routes/auth.routes';
import { authenticate } from './middleware/auth.middleware';
import { errorHandler } from './middleware/error.middleware';
import appointmentsRoutes from './routes/appointments.routes';
import posRoutes from './routes/pos.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── SECURITY MIDDLEWARE ──────────────────────────────────────────────────────

// Helmet sets various security-related HTTP headers (X-Content-Type-Options,
// X-Frame-Options, etc.) to reduce common attack surface — no logic changes needed.
app.use(helmet());

// CORS — locked to the frontend's actual origin instead of allowing any (*)
app.use(cors({
  origin: 'http://localhost:5173',
}));

app.use(express.json());

// ── RATE LIMITING ─────────────────────────────────────────────────────────────
// Hybrid keying: throttle per-USER when authenticated (so staff sharing one
// office IP/computer each get their own bucket), falling back to per-IP for
// unauthenticated routes (login, etc.). Adapts automatically if the clinic's
// network setup changes later — no code change needed.
const byUserOrIp = (req: any) => req.user?.userId ?? req.ip;
 
// General limiter — baseline protection on all /api routes. Runs before auth,
// so it keys on IP. Generous; the stricter write-limiter below does the real
// abuse-catching on sensitive operations.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,                // generous clinic-wide baseline
  standardHeaders: true,
  legacyHeaders: false,
});
 
// Strict limiter — login only. 5 / 15 min: generous for a human, brutal for
// a brute-force script. Keyed on IP (no user exists yet at login).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Demasiados intentos de inicio de sesión. Intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
 
// Write limiter — sensitive, data/money-changing operations (POS sales,
// inventory mutations, patient/record creation). Per-USER (hybrid). 40/min
// sustained comfortably covers a fast cashier or busy reception, while
// catching scripted abuse. Applied AFTER authenticate, so req.user exists.
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 40,
  keyGenerator: byUserOrIp,
  message: { success: false, message: 'Demasiadas operaciones en poco tiempo. Espere un momento e intente de nuevo.' },
  standardHeaders: true,
  legacyHeaders: false,
});
 
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
 
// Public routes
app.use('/api/auth', authRoutes);
 
// Protected routes. writeLimiter sits AFTER authenticate so it can key per-user.
app.use('/api/inventory', authenticate, writeLimiter, inventoryRoutes);
app.use('/api/appointments', authenticate, writeLimiter, appointmentsRoutes);
app.use('/api/pos', authenticate, writeLimiter, posRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Clinic API is running' });
});

// Global error handler - must be last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
