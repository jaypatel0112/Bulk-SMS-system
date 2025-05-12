import express from 'express';
import { pool } from '../index.js';
import axios from 'axios';
import cron from 'node-cron';

const router = express.Router();
const apiBaseUrl = process.env.BASE_API_URL;

// ─── 1. GET Campaigns by User Email ────────────────────────────────
router.get("/:email", async (req, res) => {
  const email = req.params.email;

  try {
    let campaignsResult;
    if (email) {
      const userResult = await pool.query(
        `SELECT user_id FROM sms_platform.employees WHERE username = $1`, [email]
      );
      const user = userResult.rows[0];

      if (user?.user_id) {
        campaignsResult = await pool.query(
          `SELECT id, name AS campaign_name, created_at, user_id, scheduled_at, sent, status
           FROM sms_platform.campaigns 
           WHERE user_id = $1 
           ORDER BY created_at DESC`, [user.user_id]
        );
      } else {
        campaignsResult = await pool.query(
          `SELECT id, name AS campaign_name, created_at, user_id, scheduled_at, sent, status
           FROM sms_platform.campaigns 
           ORDER BY created_at DESC`
        );
      }
    } else {
      campaignsResult = await pool.query(
        `SELECT id, name AS campaign_name, created_at, user_id, scheduled_at, sent, status
         FROM sms_platform.campaigns 
         ORDER BY created_at DESC`
      );
    }

    res.json(campaignsResult.rows);
  } catch (err) {
    console.error("❌ Error fetching campaigns:", err.message);
    res.status(500).json({ error: "Internal server error while fetching campaigns" });
  }
});

// ─── 2. GET Campaign Details by ID ─────────────────────────────────
router.get('/details/:id', async (req, res) => {
  const { id } = req.params;
  const { email } = req.query;

  try {
    let user_id = null;
    if (email) {
      const userResult = await pool.query(
        `SELECT user_id FROM sms_platform.employees WHERE username = $1`, [email]
      );
      user_id = userResult.rows[0]?.user_id || null;
    }

    let query = `
      SELECT c.id, c.name as campaign_name, c.sender_phone_number, c.created_at, 
             c.message_template, c.user_id, c.scheduled_at, c.sent, c.status,
             e.username as user_email
      FROM sms_platform.campaigns c
      LEFT JOIN sms_platform.employees e ON c.user_id = e.user_id
      WHERE c.id = $1`;

    const queryParams = [id];
    if (user_id) {
      query += ` AND c.user_id = $2`;
      queryParams.push(user_id);
    }

    const campaignResult = await pool.query(query, queryParams);
    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaignResult.rows[0];

    const statusResult = await pool.query(
      `SELECT delivered, failed, queued FROM sms_platform.campaigns WHERE id = $1`, [id]
    );

    const contactsResult = await pool.query(
      `SELECT first_name, last_name, phone_number 
       FROM sms_platform.campaign_target_lists WHERE campaign_id = $1`, [id]
    );

    res.json({
      ...campaign,
      report: statusResult.rows[0],
      contacts: contactsResult.rows
    });
  } catch (error) {
    console.error("Error fetching campaign details:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── 3. POST New Campaign Upload ───────────────────────────────────
router.post('/upload', async (req, res) => {
  const { campaign_name, sender_id, message_template, contacts, scheduled_at, user_email } = req.body;

  if (!campaign_name || !contacts?.length) {
    return res.status(400).json({ error: 'Campaign name and contacts are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `SELECT user_id FROM sms_platform.employees WHERE username = $1`, [user_email]
    );
    const user_id = userResult.rows[0]?.user_id || null;

    const isScheduled = !!scheduled_at;
    const initialStatus = isScheduled ? 'pending' : 'processing';

    const result = await client.query(
      `INSERT INTO sms_platform.campaigns 
       (name, created_at, sender_phone_number, message_template, scheduled_at, user_id, sent, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id`,
      [
        campaign_name,
        new Date(),
        sender_id,
        message_template,
        scheduled_at || null,
        user_id,
        !isScheduled,
        initialStatus
      ]
    );

    const campaignId = result.rows[0].id;

    const personalizedMessages = contacts.map(contact => ({
      ...contact,
      message: message_template
        .replace(/\{\{first_name\}\}/g, contact.first_name || '')
        .replace(/\{\{last_name\}\}/g, contact.last_name || '')
    }));

    for (const contact of personalizedMessages) {
      await client.query(
        `INSERT INTO sms_platform.campaign_target_lists 
         (campaign_id, first_name, last_name, phone_number, message, sender_phone_number)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [campaignId, contact.first_name, contact.last_name, contact.phone_number, contact.message, sender_id]
      );
    }

    await client.query('COMMIT');

    if (!isScheduled) {
      try {
        const response = await axios.post(`${apiBaseUrl}/api/message/send-bulk`, {
          message: message_template,
          twilioNumber: sender_id,
          contacts: personalizedMessages,
          campaign_id: campaignId,
          user_id
        });

        const updateClient = await pool.connect();
        try {
          if (response.data?.success) {
            await updateClient.query(
              `UPDATE sms_platform.campaigns 
               SET status = 'sent', processed_at = $1
               WHERE id = $2`,
              [new Date(), campaignId]
            );
          } else {
            throw new Error('Message API did not return success');
          }
        } finally {
          updateClient.release();
        }
      } catch (sendError) {
        const updateClient = await pool.connect();
        try {
          await updateClient.query(
            `UPDATE sms_platform.campaigns 
             SET status = 'failed', last_error = $1
             WHERE id = $2`,
            [sendError.message.substring(0, 255), campaignId]
          );
        } finally {
          updateClient.release();
        }
      }
    }

    res.json({ success: true, campaignId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error uploading campaign:', err.message);
    res.status(500).json({ error: 'Internal server error while uploading campaign' });
  } finally {
    client.release();
  }
});

// ─── 4. Scheduler ──────────────────────────────────────────────────
let schedulerStarted = false; 
export function initializeScheduler() {
  if (schedulerStarted) return; // Prevent re-entry
  schedulerStarted = true;

  console.log('⏰ Initializing campaign scheduler...');

  // Run once on server start
  processDueCampaigns().catch(err => {
    console.error('❌ Initial campaign check failed:', err.message);
  });

  setInterval(() => {
    console.log(`[⏱️ Scheduler] Checking campaigns at ${new Date().toISOString()}`);
    processDueCampaigns().catch(err => {
      console.error('❌ Scheduled campaign check failed:', err.message);
    });
  }, 30 * 1000);
}

export async function processDueCampaigns() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const now = new Date();
    console.log(`🔍 Checking for scheduled campaigns at ${now.toISOString()}`);

    const result = await client.query(
      `UPDATE sms_platform.campaigns 
       SET status = 'processing'
       WHERE sent = false 
       AND scheduled_at IS NOT NULL 
       AND scheduled_at <= $1
       AND status IN ('pending', 'failed')
       RETURNING id, name, message_template, sender_phone_number, user_id`,
      [now] // ⏰ Use plain Date instead of .toISOString()
    );

    const campaigns = result.rows;
    console.log(`Found ${campaigns.length} campaigns to process`);

    for (const campaign of campaigns) {
      try {
        const contactsResult = await client.query(
          `SELECT first_name, last_name, phone_number, message 
           FROM sms_platform.campaign_target_lists 
           WHERE campaign_id = $1`,
          [campaign.id]
        );

        const response = await axios.post(`${apiBaseUrl}/api/message/send-bulk`, {
          message: campaign.message_template,
          twilioNumber: campaign.sender_phone_number,
          contacts: contactsResult.rows,
          campaign_id: campaign.id,
          user_id: campaign.user_id
        });

        if (!response.data?.success) {
          throw new Error('Message API did not return success');
        }

        await client.query(
          `UPDATE sms_platform.campaigns 
           SET sent = true, status = 'sent', processed_at = $1
           WHERE id = $2`,
          [new Date(), campaign.id]
        );

        console.log(`✅ Successfully sent campaign ${campaign.id}`);
      } catch (campaignError) {
        console.error(`❌ Failed to process campaign ${campaign.id}:`, campaignError.message);

        await client.query(
          `UPDATE sms_platform.campaigns 
           SET status = 'failed', last_error = $1
           WHERE id = $2`,
          [campaignError.message.substring(0, 255), campaign.id]
        );
      }
    }

    await client.query('COMMIT');
    return campaigns.length;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Error during scheduled campaign check:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Optional Lambda
export const handler = async (event, context) => {
  console.log('⏰ Lambda campaign scheduler triggered');
  try {
    const processedCount = await processDueCampaigns();
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Campaign processing complete',
        processedCount
      })
    };
  } catch (err) {
    console.error('❌ Lambda handler error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

export default router;
