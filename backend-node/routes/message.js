import express from 'express';
import twilio from 'twilio';
import { pool } from '../index.js';
import dotenv from 'dotenv';
import format from 'pg-format';

dotenv.config();
const router = express.Router();

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  throw new Error('Twilio credentials not configured');
}
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Send bulk messages endpoint
router.post('/send-bulk', async (req, res) => {
  const { message, twilioNumber, contacts, campaign_id, user_id } = req.body;
  console.log('📤 Starting bulk send for campaign:', campaign_id);

  try {
    // Determine user_id from campaign if not explicitly provided
    let effectiveUserId = user_id;
    if (!effectiveUserId && campaign_id) {
      const campaignRes = await pool.query(
        `SELECT user_id FROM sms_platform.campaigns WHERE id = $1`,
        [campaign_id]
      );
      effectiveUserId = campaignRes.rows[0]?.user_id || null;
      console.log('✅ Resolved user_id from campaign:', effectiveUserId);
    }

    // Add missing columns to contacts table if necessary
    const columnRes = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'contacts'
      AND table_schema = 'sms_platform'
    `);
    const existingColumns = columnRes.rows.map(r => r.column_name);
    const allKeys = new Set();

    contacts.forEach(contact => {
      Object.keys(contact).forEach(key => allKeys.add(key));
    });

    const missingColumns = [...allKeys].filter(key => !existingColumns.includes(key));
    for (const col of missingColumns) {
      const safeCol = col.replace(/[^a-zA-Z0-9_]/g, '');
      await pool.query(`ALTER TABLE sms_platform.contacts ADD COLUMN IF NOT EXISTS ${safeCol} TEXT`);
      console.log('🛠️ Added missing column to contacts:', safeCol);
    }

    for (const contact of contacts) {
      const { phone_number } = contact;
      console.log('📱 Processing contact:', phone_number);

      // Skip opted-out contacts
      const optedOut = await pool.query(
        `SELECT 1 FROM sms_platform.opt_outs WHERE phone_number = $1 LIMIT 1`, 
        [phone_number]
      );
      if (optedOut.rows.length > 0) {
        console.log('🚫 Skipping opted-out number:', phone_number);
        continue;
      }

      // Insert new contact if not exists
      const contactExists = await pool.query(
        `SELECT 1 FROM sms_platform.contacts WHERE phone_number = $1 LIMIT 1`, 
        [phone_number]
      );

      if (contactExists.rows.length === 0) {
        const keys = Object.keys(contact);
        const values = Object.values(contact);
        const cols = keys.map(k => `"${k}"`).join(", ");
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

        await pool.query(
          `INSERT INTO sms_platform.contacts (${cols}) VALUES (${placeholders})`, 
          values
        );
        console.log('✅ Created new contact:', phone_number);
      }

      // Personalize message
      const personalizedMessage = message
        .replace(/\$\{first_name\}/g, contact.first_name || '')
        .replace(/\$\{last_name\}/g, contact.last_name || '');

      // Send via Twilio
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
            `UPDATE sms_platform.campaigns SET failed = COALESCE(failed, 0) + 1 WHERE id = $1`, 
            [campaign_id]
          );
        }
        continue;
      }

      // Handle conversation linkage
      const conversation = await pool.query(
        `SELECT id FROM sms_platform.conversations WHERE contact_phone = $1 ORDER BY last_message_at DESC LIMIT 1`,
        [phone_number]
      );

      let conversationId;
      if (conversation.rows.length > 0) {
        conversationId = conversation.rows[0].id;
      } else {
        const newConv = await pool.query(
          `INSERT INTO sms_platform.conversations (contact_phone, status, last_message_at, twilio_number) 
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [phone_number, 'active', new Date(), twilioNumber]
        );
        conversationId = newConv.rows[0].id;
        console.log('🆕 Created new conversation:', conversationId);
      }
      // Store message
      await pool.query(
        `INSERT INTO sms_platform.messages (
          twilio_sid, direction, status, body, 
          from_number, to_number, sent_at, 
          user_id, conversation_id, campaign_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          messageSent.sid,
          'outbound',
          messageSent.status,
          personalizedMessage,
          twilioNumber,
          phone_number,
          new Date(),
          effectiveUserId,
          conversationId,
          campaign_id,
        ]
      );

      await pool.query(
        `UPDATE sms_platform.conversations SET last_message_at = $1 WHERE id = $2`,
        [new Date(), conversationId]
      );
    }

    res.json({ 
      success: true,
      message: '✅ Bulk messages processed successfully',
      stats: {
        total_contacts: contacts.length,
        user_id: effectiveUserId
      }
    });
  } catch (err) {
    console.error('❌ Error in /send-bulk:', err.message);
    res.status(500).json({ 
      error: 'Internal server error',
      details: err.message 
    });
  }
});


// Incoming message webhook
router.post('/incoming', async (req, res) => {
  try {
    const { MessageSid, Body, From, To } = req.body;
    console.log('Incoming message from:', From);

    const lowered = Body.trim().toLowerCase();
    const optOutKeywords = ['stop', 'unsubscribe', 'cancel', 'quit', 'end'];
    const isOptOut = optOutKeywords.includes(lowered);

    const normalizedFrom = From.startsWith('+') ? From.slice(1) : From;

    // 1. Store incoming message in database
    const messageInsert = await pool.query(
      `INSERT INTO sms_platform.messages (twilio_sid, direction, status, body, from_number, to_number, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [MessageSid, 'inbound', 'received', Body, From, To, new Date()]
    );

    // 2. Find or create conversation
    let conversationId = null;
    const existingConversation = await pool.query(
      `SELECT * FROM sms_platform.conversations WHERE contact_phone = $1 ORDER BY last_message_at DESC LIMIT 1`,
      [normalizedFrom]
    );

    if (existingConversation.rows.length > 0) {
      conversationId = existingConversation.rows[0].id;

      if (isOptOut) {
        await pool.query(
          `UPDATE sms_platform.conversations SET status = $1 WHERE id = $2`,
          ['deactivated_by_user', conversationId]
        );
      }
    } else {
      const status = isOptOut ? 'deactivated_by_user' : 'active';
      const newConversation = await pool.query(
        `INSERT INTO sms_platform.conversations (contact_phone, status, last_message_at)
         VALUES ($1, $2, $3) RETURNING id`,
        [normalizedFrom, status, new Date()]
      );
      conversationId = newConversation.rows[0].id;
    }

    // 3. Update conversation with latest timestamp and link the message
    await pool.query(
      `UPDATE sms_platform.conversations SET last_message_at = $1 WHERE id = $2`,
      [new Date(), conversationId]
    );

    await pool.query(
      `UPDATE sms_platform.messages SET conversation_id = $1 WHERE twilio_sid = $2`,
      [conversationId, MessageSid]
    );

    // 4. Handle opt-out confirmation message ONLY if it's an opt-out keyword
    if (isOptOut) {
      const alreadyOptedOut = await pool.query(
        `SELECT 1 FROM sms_platform.opt_outs WHERE phone_number = $1 LIMIT 1`,
        [normalizedFrom]
      );

      if (alreadyOptedOut.rows.length === 0) {
        // Insert into contacts if not exist
        await pool.query(
          `INSERT INTO sms_platform.contacts (phone_number) VALUES ($1) ON CONFLICT DO NOTHING`,
          [normalizedFrom]
        );

        // Insert into opt_outs table
        await pool.query(
          `INSERT INTO sms_platform.opt_outs (phone_number, contact_phone, reason, opt_out_keyword, processed_in_twilio)
           VALUES ($1, $2, $3, $4, $5)`,
          [normalizedFrom, normalizedFrom, 'User replied with opt-out keyword', lowered, false]
        );

        // Send ONLY unsubscribe confirmation SMS
        await twilioClient.messages.create({
          to: From,
          from: To,
          body: "You've been unsubscribed and will no longer receive messages from us.",
        });
      }
    }



  } catch (error) {
    console.error('❌ Incoming message error:', error);
    res.sendStatus(500);
  }
});


// Get recent inbound messages
router.get('/inbound', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, u.email as user_email 
       FROM sms_platform.messages m
       LEFT JOIN sms_platform.users u ON m.user_id = u.id
       WHERE direction = 'inbound' 
       ORDER BY sent_at DESC LIMIT 10`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching inbound messages:', err.message);
    res.status(500).json({ error: 'Failed to fetch inbound messages' });
  }
});

// Get all conversations
router.get('/conversations', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.contact_phone, c.status, c.last_message_at,
              m.body AS last_message, m.sent_at, m.direction, u.email as user_email
       FROM sms_platform.conversations c
       LEFT JOIN LATERAL (
         SELECT body, sent_at, direction, user_id
         FROM sms_platform.messages
         WHERE conversation_id = c.id
         ORDER BY sent_at DESC
         LIMIT 1
       ) m ON true
       LEFT JOIN sms_platform.users u ON m.user_id = u.id
       ORDER BY c.last_message_at DESC
       LIMIT 20`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching conversations:', err.message);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get messages for a specific conversation
router.get('/conversations/:id/messages', async (req, res) => {
  const conversationId = req.params.id;
  try {
    const result = await pool.query(
      `SELECT 
        m.id,
        m.body,
        m.sent_at,
        m.direction,
        m.from_number,
        m.to_number,
        m.status,
        u.email as user_email
       FROM sms_platform.messages m
       LEFT JOIN sms_platform.users u ON m.user_id = u.id
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

// Manual reply endpoint
router.post('/reply', async (req, res) => {
  const { to, from, body, user_id } = req.body;

  if (!to || !body) {
    return res.status(400).json({ error: "'to' and 'body' are required" });
  }

  const fromNumber = from;

  try {
    const sentMsg = await twilioClient.messages.create({
      to,
      from: fromNumber,
      body,
    });

    const conversation = await pool.query(
      `SELECT id FROM sms_platform.conversations WHERE contact_phone = $1 ORDER BY last_message_at DESC LIMIT 1`,
      [to.startsWith('+') ? to.slice(1) : to]
    );

    let conversationId = conversation.rows.length ? conversation.rows[0].id : null;

    if (!conversationId) {
      const newConv = await pool.query(
        `INSERT INTO sms_platform.conversations (contact_phone, status, last_message_at)
         VALUES ($1, $2, $3) RETURNING id`,
        [to.startsWith('+') ? to.slice(1) : to, 'active', new Date()]
      );
      conversationId = newConv.rows[0].id;
    }

    await pool.query(
      `INSERT INTO sms_platform.messages (twilio_sid, direction, status, body, from_number, to_number, sent_at, user_id, conversation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        sentMsg.sid,
        'outbound',
        sentMsg.status,
        body,
        fromNumber,
        to,
        new Date(),
        user_id,
        conversationId,
      ]
    );

    await pool.query(
      `UPDATE sms_platform.conversations SET last_message_at = $1 WHERE id = $2`,
      [new Date(), conversationId]
    );

    res.json({ message: 'Message sent successfully', sid: sentMsg.sid });
  } catch (err) {
    console.error('❌ Error sending message:', err.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;