import express from 'express';
import { pool } from '../index.js'; // Your pool connection
const router = express.Router();

// Helper to normalize phone numbers (remove +, -, spaces, etc.)
function normalizePhoneNumber(number) {
  return number.replace(/[^\d]/g, '');
}

router.get('/inbox/:email', async (req, res) => {
  const email = decodeURIComponent(req.params.email);

  try {
    // 1. Find user and their role
    const employeeResult = await pool.query(
      `SELECT user_id, role FROM sms_platform.employees WHERE username = $1`,
      [email]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const { user_id, role } = employeeResult.rows[0];

    // 2. Fetch all Twilio numbers in the system
    const allNumbersResult = await pool.query(`SELECT phone_number FROM sms_platform.twilio_numbers`);
    const allTwilioNumbers = allNumbersResult.rows.map(r => normalizePhoneNumber(r.phone_number));

    let employeeNumbers = [];

    if (role !== 1) {
      // Employee role = 2, get only their assigned numbers
      const userNumbersResult = await pool.query(
        `SELECT phone_number FROM sms_platform.twilio_numbers WHERE user_id = $1`,
        [user_id]
      );
      employeeNumbers = userNumbersResult.rows.map(r => normalizePhoneNumber(r.phone_number));
      
      if (employeeNumbers.length === 0) {
        return res.status(404).json({ message: 'No Twilio numbers assigned to this user' });
      }
    }

    // 3. Fetch all messages
    const messagesResult = await pool.query(
      `SELECT id, from_number, to_number, body, direction, created_at
       FROM sms_platform.messages
       ORDER BY created_at ASC`
    );

    const messages = messagesResult.rows;

    // 4. Group messages into conversations
    const conversations = {};

    messages.forEach(msg => {
      const normalizedFrom = normalizePhoneNumber(msg.from_number);
      const normalizedTo = normalizePhoneNumber(msg.to_number);

      let twilioNumber = "";
      let contactNumber = "";

      // Determine which number is Twilio side and which is Contact side
      if (allTwilioNumbers.includes(normalizedFrom)) {
        twilioNumber = normalizedFrom;
        contactNumber = normalizedTo;
      } else if (allTwilioNumbers.includes(normalizedTo)) {
        twilioNumber = normalizedTo;
        contactNumber = normalizedFrom;
      } else {
        // Neither is Twilio number → skip
        return;
      }

      // For Employee, only pick messages related to their own Twilio numbers
      if (role !== 1 && !employeeNumbers.includes(twilioNumber)) {
        return;
      }

      const conversationKey = `${twilioNumber}_${contactNumber}`;

      if (!conversations[conversationKey]) {
        conversations[conversationKey] = {
          twilio_number: `+${twilioNumber}`,
          contact_phone: `+${contactNumber}`,
          messages: []
        };
      }

      conversations[conversationKey].messages.push({
        id: msg.id,
        body: msg.body,
        direction: msg.direction,
        timestamp: msg.created_at
      });
    });

    res.json(Object.values(conversations));
    
  } catch (err) {
    console.error('❌ Error fetching inbox:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
