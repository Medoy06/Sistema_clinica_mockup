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

// General limiter — applies to all /api routes as a baseline protection
// against abuse / resource exhaustion from a single IP.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter — applies specifically to login attempts.
// 5 attempts per 15 minutes is generous for a real user, brutal for a brute-force script.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, message: 'Demasiados intentos de inicio de sesión. Intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/inventory', authenticate, inventoryRoutes);
app.use('/api/appointments', authenticate, appointmentsRoutes);

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
