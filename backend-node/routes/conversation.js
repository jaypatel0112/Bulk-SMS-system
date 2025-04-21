// routes/conversation.js
import express from 'express';
import { pool } from '../index.js';

const router = express.Router();

// Get all conversations (Inbox)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.contact_phone, c.status, c.last_message_at,
             m.body AS last_message, m.sent_at, m.direction
      FROM conversations c
      LEFT JOIN LATERAL (
        SELECT body, sent_at, direction
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY sent_at DESC
        LIMIT 1
      ) m ON true
      ORDER BY c.last_message_at DESC
      LIMIT 20;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching conversations:', err.message);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get messages for a conversation
router.get('/:id/messages', async (req, res) => {
  const conversationId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY sent_at ASC`,
      [conversationId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching conversation messages:', err.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
