import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import messageRoutes from './routes/message.js';
import campaignRoutes from './routes/campaign.js';
import messageStatusRoutes from './routes/status.js';
import authRouter from './routes/auth.js';
import userRoutes from './routes/user.js';
import twilionumberRoutes from './routes/twilionumber.js';
import inboxRoutes from './routes/inbox.js';
import { initializeScheduler } from './routes/campaign.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Routes
app.use('/api/message', messageRoutes);
app.use('/api/campaign', campaignRoutes);
app.use('/api/message', messageStatusRoutes);
app.use('/api/auth', authRouter);
app.use('/api/user', userRoutes);
app.use('/api/twilionumber', twilionumberRoutes);
app.use('/api/twilio-numbers', twilionumberRoutes);
app.use('/api', inboxRoutes);

initializeScheduler();

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Database connection test (using the pool directly)
import { testConnection } from './db/index.js';

// Test database connection on startup
testConnection()
  .then(connected => {
    if (!connected) {
      console.error('⚠️ Application starting without database connection');
    }
  })
  .catch(err => {
    console.error('⚠️ Database connection test failed:', err);
  });

export default app;