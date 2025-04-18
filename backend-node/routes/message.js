// routes/message.js
import express from 'express';
import twilio from 'twilio';
import { pool } from '../index.js';

import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// POST /api/message/send-bulk
router.post('/send-bulk', async (req, res) => {
    const { message, twilioNumber, contacts } = req.body;
  
    try {
      for (const contact of contacts) {
        const { phone_number, first_name, last_name } = contact;
  
        // ✅ Step 0: Check if this number has opted out
        const optedOut = await pool.query(
          `SELECT 1 FROM opt_outs WHERE phone_number = $1 LIMIT 1`,
          [phone_number]
        );
  
        if (optedOut.rows.length > 0) {
          console.log(`⛔ Skipping opted-out contact: ${phone_number}`);
          continue; // Skip this contact
        }
  
        // ✅ Step 1: Ensure contact exists in the contacts table
        const contactExists = await pool.query(
          `SELECT 1 FROM contacts WHERE phone_number = $1 LIMIT 1`,
          [phone_number]
        );
  
        if (contactExists.rows.length === 0) {
          await pool.query(
            `INSERT INTO contacts (phone_number, first_name, last_name)
             VALUES ($1, $2, $3)`,
            [phone_number, first_name, last_name]
          );
          console.log(`👤 Contact added: ${phone_number}`);
        }
  
        // ✅ Step 2: Personalize the message
        const personalizedMessage = message
          .replace('${first_name}', first_name)
          .replace('${last_name}', last_name);
  
        // ✅ Step 3: Send message via Twilio
        const messageSent = await twilioClient.messages.create({
          body: personalizedMessage,
          from: twilioNumber,
          to: phone_number,
        });
  
        // ✅ Step 4: Save message to DB
        await pool.query(
          `INSERT INTO messages (twilio_sid, direction, status, body, from_number, to_number, sent_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            messageSent.sid,
            'outbound',
            messageSent.status,
            personalizedMessage,
            twilioNumber,
            phone_number,
            new Date(),
          ]
        );
  
        console.log(`✅ Message sent to: ${phone_number}`);
      }
  
      res.json({ message: 'Bulk messages processed. Skipped opted-out contacts.' });
    } catch (err) {
      console.error('❌ Error sending bulk messages:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  

// POST /api/message/incoming - Webhook for incoming messages
router.post('/incoming', async (req, res) => {
    try {
      // Log the entire request body
      console.log('Received webhook data:', req.body);
  
      // Save incoming message to DB
      const result = await pool.query(
        `INSERT INTO messages (twilio_sid, direction, status, body, from_number, to_number, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          req.body.MessageSid,  // Twilio message SID
          'inbound',            // Direction: inbound
          'received',           // Status: received
          req.body.Body,       // Message body
          req.body.From,       // Sender's phone number
          req.body.To,         // Receiver's phone number
          new Date(),          // Timestamp of receipt
        ]
      );
  
      // ✅ Check if it's an opt-out message
      const lowered = req.body.Body.trim().toLowerCase();
      const optOutKeywords = ['stop', 'unsubscribe', 'cancel', 'quit', 'end'];
  
      if (optOutKeywords.includes(lowered)) {
        const optOutCheck = await pool.query(
          `SELECT 1 FROM opt_outs WHERE phone_number = $1 LIMIT 1`,
          [req.body.From]
        );
  
        if (optOutCheck.rows.length === 0) {
          // Ensure contact exists before proceeding
          const contactCheck = await pool.query(
            `SELECT phone_number FROM contacts WHERE phone_number = $1 LIMIT 1`,
            [req.body.From]
          );
          if (contactCheck.rows.length === 0) {
            // Insert the contact if not found
            await pool.query(
              `INSERT INTO contacts (phone_number)
               VALUES ($1)`,
              [req.body.From]
            );
            console.log(`📱 Contact with phone number ${req.body.From} inserted.`);
          }
  
          // Optional: link to contact if it exists
          const contact = await pool.query(
            `SELECT phone_number FROM contacts WHERE phone_number = $1 LIMIT 1`,
            [req.body.From]
          );
          const contactPhone = contact.rows.length > 0 ? contact.rows[0].phone_number : null;
  
          // Insert into opt_outs
          await pool.query(
            `INSERT INTO opt_outs (phone_number, contact_phone, reason, opt_out_keyword, processed_in_twilio)
             VALUES ($1, $2, $3, $4, $5)`,
            [req.body.From, contactPhone, 'User replied with opt-out keyword', lowered, false]
          );
  
          console.log(`🚫 ${req.body.From} has opted out using '${lowered}'`);
  
          // Optional: auto-reply
          await twilioClient.messages.create({
            to: req.body.From,
            from: req.body.To,
            body: "You've been unsubscribed and will no longer receive messages from us.",
          });
        } else {
          console.log(`⚠️ ${req.body.From} already in opt_outs`);
        }
      }
  
      // ✅ Continue conversation logic regardless of opt-out
      const conversation = await pool.query(
        `SELECT * FROM conversations WHERE contact_phone = $1 ORDER BY last_message_at DESC LIMIT 1`,
        [req.body.From]
      );
  
      let conversationId = null;
      if (conversation.rows.length > 0) {
        conversationId = conversation.rows[0].id;
      } else {
        const newConversation = await pool.query(
          `INSERT INTO conversations (contact_phone, status, last_message_at)
           VALUES ($1, $2, $3) RETURNING id`,
          [req.body.From, 'active', new Date()]
        );
        conversationId = newConversation.rows[0].id;
      }
  
      await pool.query(
        `UPDATE conversations SET last_message_at = $1 WHERE id = $2`,
        [new Date(), conversationId]
      );
  
      await pool.query(
        `UPDATE messages SET conversation_id = $1 WHERE twilio_sid = $2`,
        [conversationId, req.body.MessageSid]
      );
  
      res.status(200).send('<Response><Message>Thanks for your message!</Message></Response>');
  
    } catch (err) {
      console.error('❌ Error storing incoming message:', err.message);
      res.status(500).send('Server Error');
    }
  });
    
  
// GET /api/message/inbound - Fetch latest incoming messages
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
  


export default router;
