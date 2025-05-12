import express from 'express';
import { pool } from '../index.js';

const router = express.Router();

router.post('/status', async (req, res) => {
  const {
    MessageSid,
    MessageStatus,
    To,
    From,
    SmsStatus,
    ErrorCode,
    ErrorMessage,
  } = req.body;

  try {
    console.log('Twilio status callback received:', req.body);

    // 1. Update the message status
    await pool.query(
      `UPDATE sms_platform.messages 
       SET status = $1::VARCHAR, 
           delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE delivered_at END 
       WHERE twilio_sid = $2`,
      [MessageStatus || SmsStatus, MessageSid]
    );

    // 2. Get the campaign ID from the message
    const messageResult = await pool.query(
      `SELECT campaign_id FROM sms_platform.messages WHERE twilio_sid = $1`,
      [MessageSid]
    );
    

    if (messageResult.rows.length === 0) {
      return res.status(404).send('Message not found');
    }

    const campaignId = messageResult.rows[0].campaign_id;

    // 3. Update the campaign's status count based on message status
    if (MessageStatus) {
      // Determine which column to increment based on the MessageStatus
      let statusColumn;
      switch (MessageStatus.toLowerCase()) {
        case 'delivered':
          statusColumn = 'delivered';
          break;
        case 'failed':
          statusColumn = 'failed';
          break;
        case 'queued':
          statusColumn = 'queued';
          break;
        default:
          return res.status(400).send('Invalid message status');
      }

      // Increment the corresponding status column in the campaign table
      await pool.query(
        `UPDATE sms_platform.campaigns
         SET ${statusColumn} = ${statusColumn} + 1
         WHERE id = $1`,
        [campaignId]
      );
    }

    res.status(200).send('Status received');
  } catch (err) {
    console.error('Error updating message status:', err);
    res.status(500).send('Internal Server Error');
  }
});


// Helper delay function for retry
const delay = (ms) => new Promise((res) => setTimeout(res, ms));



export default router;