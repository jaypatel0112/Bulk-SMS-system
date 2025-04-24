import express from 'express';
import twilio from 'twilio';
import { pool } from '../index.js';
import dotenv from 'dotenv';
import format from 'pg-format';

dotenv.config();
const router = express.Router();
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

router.post('/send-bulk', async (req, res) => {
  const { message, twilioNumber, contacts, campaign_id } = req.body;
  const userId = req.user?.id || null;

  try {
    // 1. Get current columns in contacts table
    const columnRes = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'contacts'
    `);
    const existingColumns = columnRes.rows.map(r => r.column_name);

    // 2. Determine missing columns from contacts
    const allKeys = new Set();
    contacts.forEach(contact => {
      Object.keys(contact).forEach(key => allKeys.add(key));
    });

    const missingColumns = [...allKeys].filter(key =>
      !existingColumns.includes(key)
    );

    // 3. Alter table to add missing columns as TEXT
    for (const col of missingColumns) {
      const safeCol = col.replace(/[^a-zA-Z0-9_]/g, ''); // sanitize
      await pool.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ${safeCol} TEXT`);
    }

    for (const contact of contacts) {
      const { phone_number } = contact;

      const optedOut = await pool.query(`SELECT 1 FROM opt_outs WHERE phone_number = $1 LIMIT 1`, [phone_number]);
      if (optedOut.rows.length > 0) continue;

      // 4. Check if contact exists
      const contactExists = await pool.query(
        `SELECT 1 FROM contacts WHERE phone_number = $1 LIMIT 1`, [phone_number]
      );

      // 5. Insert if doesn't exist
      if (contactExists.rows.length === 0) {
        const keys = Object.keys(contact);
        const values = Object.values(contact);

        // Ensure that missing columns are included in the INSERT statement
        const cols = keys.map(k => `"${k}"`).join(", ");
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

        // Inserting the contact into the contacts table with missing column values
        await pool.query(
          `INSERT INTO contacts (${cols}) VALUES (${placeholders})`, values
        );
      } else {
        // If the contact exists, you can optionally update it if necessary
        const updateKeys = Object.keys(contact);
        const updateValues = Object.values(contact);
        const updateSet = updateKeys.map((key, index) => `"${key}" = $${index + 1}`).join(", ");

        await pool.query(
          `UPDATE contacts SET ${updateSet} WHERE phone_number = $${updateKeys.length + 1}`,
          [...updateValues, contact.phone_number]
        );
      }

      // 6. Personalized message
      const personalizedMessage = message
        .replace('${first_name}', contact.first_name || '')
        .replace('${last_name}', contact.last_name || '');

      let messageSent;
      try {
        messageSent = await twilioClient.messages.create({
          body: personalizedMessage,
          from: twilioNumber,
          to: phone_number,
          statusCallback: `${process.env.BASE_API_URL}/api/message/status`,
        });
      } catch (twilioError) {
        console.error(`❌ Error sending to ${phone_number}:`, twilioError.message);
        if (campaign_id) {
          await pool.query(
            `UPDATE campaigns SET failed = COALESCE(failed, 0) + 1 WHERE id = $1`, [campaign_id]
          );
        }
        continue;
      }

      // 7. Handle conversation/message
      const conversation = await pool.query(
        `SELECT id FROM conversations WHERE contact_phone = $1 ORDER BY last_message_at DESC LIMIT 1`,
        [phone_number]
      );

      let conversationId;
      if (conversation.rows.length > 0) {
        conversationId = conversation.rows[0].id;
      } else {
        const newConv = await pool.query(
          `INSERT INTO conversations (contact_phone, status, last_message_at) VALUES ($1, $2, $3) RETURNING id`,
          [phone_number, 'active', new Date()]
        );
        conversationId = newConv.rows[0].id;
      }

      await pool.query(
        `INSERT INTO messages (twilio_sid, direction, status, body, from_number, to_number, sent_at, user_id, conversation_id, campaign_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          messageSent.sid,
          'outbound',
          messageSent.status,
          personalizedMessage,
          twilioNumber,
          phone_number,
          new Date(),
          userId,
          conversationId,
          campaign_id,
        ]
      );

      await pool.query(
        `UPDATE conversations SET last_message_at = $1 WHERE id = $2`,
        [new Date(), conversationId]
      );
    }

    res.json({ message: 'Bulk messages processed.' });
  } catch (err) {
    console.error('❌ Error sending bulk messages:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/message/incoming
router.post('/incoming', async (req, res) => {
  try {
    const { MessageSid, Body, From, To } = req.body;

    const lowered = Body.trim().toLowerCase();
    const optOutKeywords = ['stop', 'unsubscribe', 'cancel', 'quit', 'end'];
    const isOptOut = optOutKeywords.includes(lowered);

    const normalizedFrom = From.startsWith('+') ? From.slice(1) : From;

    const messageInsert = await pool.query(
      `INSERT INTO messages (twilio_sid, direction, status, body, from_number, to_number, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [MessageSid, 'inbound', 'received', Body, From, To, new Date()]
    );

    let conversationId = null;
    const existingConversation = await pool.query(
      `SELECT * FROM conversations WHERE contact_phone = $1 ORDER BY last_message_at DESC LIMIT 1`,
      [normalizedFrom]
    );

    if (existingConversation.rows.length > 0) {
      conversationId = existingConversation.rows[0].id;
      if (isOptOut) {
        await pool.query(
          `UPDATE conversations SET status = $1 WHERE id = $2`,
          ['deactivated_by_user', conversationId]
        );
      }
    } else {
      const status = isOptOut ? 'deactivated_by_user' : 'active';
      const newConversation = await pool.query(
        `INSERT INTO conversations (contact_phone, status, last_message_at)
         VALUES ($1, $2, $3) RETURNING id`,
        [normalizedFrom, status, new Date()]
      );
      conversationId = newConversation.rows[0].id;
    }

    await pool.query(
      `UPDATE conversations SET last_message_at = $1 WHERE id = $2`,
      [new Date(), conversationId]
    );

    await pool.query(
      `UPDATE messages SET conversation_id = $1 WHERE twilio_sid = $2`,
      [conversationId, MessageSid]
    );

    if (isOptOut) {
      const alreadyOptedOut = await pool.query(
        `SELECT 1 FROM opt_outs WHERE phone_number = $1 LIMIT 1`,
        [normalizedFrom]
      );

      if (alreadyOptedOut.rows.length === 0) {
        await pool.query(
          `INSERT INTO contacts (phone_number) VALUES ($1) ON CONFLICT DO NOTHING`,
          [normalizedFrom]
        );

        await pool.query(
          `INSERT INTO opt_outs (phone_number, contact_phone, reason, opt_out_keyword, processed_in_twilio)
           VALUES ($1, $2, $3, $4, $5)`,
          [normalizedFrom, normalizedFrom, 'User replied with opt-out keyword', lowered, false]
        );

        await twilioClient.messages.create({
          to: From,
          from: To,
          body: "You've been unsubscribed and will no longer receive messages from us.",
        });
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Incoming message error:', error);
    res.sendStatus(500);
  }
});

// GET /api/message/inbound
router.get('/inbound', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM messages WHERE direction = 'inbound' ORDER BY sent_at DESC LIMIT 10`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching inbound messages:', err.message);
    res.status(500).json({ error: 'Failed to fetch inbound messages' });
  }
});

// GET /api/conversations
router.get('/conversations', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.contact_phone, c.status, c.last_message_at,
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
       LIMIT 20`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching conversations:', err.message);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/conversations/:id/messages
router.get('/conversations/:id/messages', async (req, res) => {
  const conversationId = req.params.id;
  try {
    const result = await pool.query(
      `SELECT 
        id,
        body,
        sent_at,
        direction,
        from_number,
        to_number,
        status
       FROM messages
       WHERE conversation_id = $1
       ORDER BY sent_at ASC`,
      [conversationId]
    );

    const formattedMessages = result.rows.map(msg => ({
      ...msg,
      direction: msg.direction === 'outbound' ? 'outgoing' : 'incoming'
    }));

    res.json(formattedMessages);
  } catch (err) {
    console.error('❌ Error fetching conversation messages:', err.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/message/reply
router.post('/reply', async (req, res) => {
  const { to, from, body } = req.body;
  const userId = req.user?.id || null;

  if (!to || !body) {
    return res.status(400).json({ error: "'to' and 'body' are required" });
  }

  const fromNumber = from || process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!fromNumber) {
    return res.status(400).json({ error: "'from' or 'MessagingServiceSid' is required" });
  }

  try {
    const sentMsg = await twilioClient.messages.create({
      to,
      from: fromNumber,
      body,
    });

    const conversation = await pool.query(
      `SELECT id FROM conversations WHERE contact_phone = $1 ORDER BY last_message_at DESC LIMIT 1`,
      [to.startsWith('+') ? to.slice(1) : to]
    );

    let conversationId = conversation.rows.length ? conversation.rows[0].id : null;

    if (!conversationId) {
      const newConv = await pool.query(
        `INSERT INTO conversations (contact_phone, status, last_message_at)
         VALUES ($1, $2, $3) RETURNING id`,
        [to.startsWith('+') ? to.slice(1) : to, 'active', new Date()]
      );
      conversationId = newConv.rows[0].id;
    }

    await pool.query(
      `INSERT INTO messages (twilio_sid, direction, status, body, from_number, to_number, sent_at, user_id, conversation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        sentMsg.sid,
        'outbound',
        sentMsg.status,
        body,
        fromNumber,
        to,
        new Date(),
        userId,
        conversationId,
      ]
    );

    await pool.query(
      `UPDATE conversations SET last_message_at = $1 WHERE id = $2`,
      [new Date(), conversationId]
    );

    res.json({ message: 'Message sent successfully', sid: sentMsg.sid });
  } catch (err) {
    console.error('❌ Error sending message:', err.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
