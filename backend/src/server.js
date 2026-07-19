import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';

import authRoutes     from './routes/auth.js';
import wardrobeRoutes from './routes/wardrobe.js';
import outfitRoutes   from './routes/outfit.js';
import chatRoutes     from './routes/chat.js';
import shoppingRoutes from './routes/shopping.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB();

const app = express();

app.use(helmet());
app.use(mongoSanitize());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:8081', credentials: true }));
app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
  message: { success: false, message: 'Too many requests, slow down!' }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '✅ Fitora Backend is running!',
    timestamp: new Date().toISOString(),
    stack: '100% FREE',
    services: {
      database:    'MongoDB Atlas (Free)',
      aiEngine:    'Ollama (local) → Hugging Face (free) → Rule-based (always works)',
      mlService:   process.env.ML_SERVICE_URL || 'http://localhost:8000',
      colorAnalysis: 'Sharp (free, built-in)',
      paidAPIs:    'NONE ✅'
    }
  });
});

app.use('/api/auth',     authRoutes);
app.use('/api/wardrobe', wardrobeRoutes);
app.use('/api/outfit',   outfitRoutes);
app.use('/api/chat',     chatRoutes);
app.use('/api/shopping', shoppingRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'Image too large (max 10MB)' });
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n' + '═'.repeat(62));
  console.log('  🎩  FITORA AI STYLIST — FREE STACK BACKEND');
  console.log('═'.repeat(62));
  console.log(`  🚀  Server:       http://localhost:${PORT}`);
  console.log(`  💾  MongoDB:      Atlas Free Tier ✅`);
  console.log(`  🤖  AI Engine:    Ollama → HuggingFace → Rule-based`);
  console.log(`  🧠  ML Service:   ${process.env.ML_SERVICE_URL || 'http://localhost:8000'}`);
  console.log(`  🎨  Color:        Sharp (built-in, free)`);
  console.log(`  💰  Paid APIs:    NONE`);
  console.log('═'.repeat(62));
  console.log('  📋  Endpoints:');
  console.log('      POST  /api/auth/register    → Sign up');
  console.log('      POST  /api/auth/login       → Login');
  console.log('      POST  /api/wardrobe/upload  → Add clothing item');
  console.log('      GET   /api/wardrobe         → Get all items');
  console.log('      POST  /api/outfit/generate  → Generate outfits');
  console.log('      POST  /api/outfit/analyze   → Analyze outfit photo');
  console.log('      POST  /api/chat             → Chat with AI stylist');
  console.log('      GET   /api/shopping         → Shopping suggestions');
  console.log('═'.repeat(62) + '\n');
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
});

export default app;
