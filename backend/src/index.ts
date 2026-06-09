import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import inventoryRoutes from './routes/inventory.routes';
import authRoutes from './routes/auth.routes';
import { authenticate } from './middleware/auth.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/inventory', authenticate, inventoryRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Clinic API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;