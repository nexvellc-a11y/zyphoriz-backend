const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const businessRoutes = require('./routes/business.routes');
const categoryRoutes = require('./routes/category.routes');
const paymentRoutes = require('./routes/payment.routes');
const userRoutes = require('./routes/user.routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

// ── Security & core middleware ──────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false })); 
const allowedOrigins = [
  ...(process.env.CLIENT_URL || '').split(','),
  'http://localhost:5173',
  'https://zyphoriz.com',
  'https://www.zyphoriz.com',
  'https://zyphoriz.in',
  'https://www.zyphoriz.in',
]
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({
  limit: '2mb',
  verify: (req, res, buffer) => {
    if (req.originalUrl === '/api/v1/payments/webhook') {
      req.rawBody = buffer.toString('utf8');
    }
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Basic rate limiting on auth routes to slow down brute-force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/v1/auth', authLimiter);

// ── Health check ─────────────────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => res.json({ success: true, message: 'zyphoriz API is running' }));

// ── Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/businesses', businessRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/users', userRoutes);

// ── 404 + error handling ─────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
