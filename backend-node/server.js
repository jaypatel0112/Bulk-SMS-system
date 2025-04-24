// server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import messageRoutes from './routes/message.js';
import campaignRoutes from './routes/campaign.js';
import conversationRoutes from './routes/conversation.js';
import messageStatusRoutes from './routes/status.js';
import authRouter from './routes/auth.js';  // Import auth.js router


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middleware (corrected)
app.use(cors());
app.use(express.urlencoded({ extended: false })); // for Twilio webhook
app.use(express.json());                         // for JSON payloads

// Routes
app.use('/api/message', messageRoutes);
app.use('/api/campaign', campaignRoutes);
app.use('/api/conversations', conversationRoutes);
app.use("/api/message", messageStatusRoutes);
app.use('/api/auth', authRouter);


// DB
import { pool } from './index.js';

pool.connect()
  .then(client => {
    console.log('✅ Database connected');
    client.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
