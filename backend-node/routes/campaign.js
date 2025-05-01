import express from 'express';
import { pool } from '../index.js';
import axios from 'axios';
import cron from 'node-cron';

const router = express.Router();
const apiBaseUrl = process.env.BASE_API_URL;

// Get campaigns for a specific user
router.get("/:email", async (req, res) => {
  const email = req.params.email;

  console.log("Received email:", email);

  try {
    let campaignsResult;

    if (email) {
      const userResult = await pool.query(
        `SELECT user_id FROM employees WHERE username = $1`,
        [email]
      );

      const user = userResult.rows[0];
      console.log("User found:", user);

      if (user) {
        console.log("User ID:", user.user_id);
        if (user.user_id !== null) {
          campaignsResult = await pool.query(
            `SELECT id, name AS campaign_name, created_at, user_id 
             FROM campaigns 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [user.user_id]
          );
        } else {
          console.log("User_id is null, returning all campaigns.");
          campaignsResult = await pool.query(
            `SELECT id, name AS campaign_name, created_at, user_id 
             FROM campaigns 
             ORDER BY created_at DESC`
          );
        }
      } else {
        console.log("No user found, returning all campaigns.");
        campaignsResult = await pool.query(
          `SELECT id, name AS campaign_name, created_at, user_id 
           FROM campaigns 
           ORDER BY created_at DESC`
        );
      }
    } else {
      console.log("No email provided, returning all campaigns.");
      campaignsResult = await pool.query(
        `SELECT id, name AS campaign_name, created_at, user_id 
         FROM campaigns 
         ORDER BY created_at DESC`
      );
    }

    res.json(campaignsResult.rows);
  } catch (err) {
    console.error("❌ Error fetching campaigns:", err.message);
    res.status(500).json({ error: "Internal server error while fetching campaigns" });
  }
});

// Get campaign details by ID with user validation
router.get('/details/:id', async (req, res) => {
  const { id } = req.params;
  const { email } = req.query; // Get email from query params

  try {
    // First get user_id if email is provided
    let user_id = null;
    if (email) {
      const userResult = await pool.query(
        `SELECT user_id FROM employees WHERE username = $1`,
        [email]
      );
      user_id = userResult.rows[0]?.user_id || null;
    }

    // Build base query
    let query = `
      SELECT 
        c.id, 
        c.name as campaign_name, 
        c.sender_phone_number, 
        c.created_at, 
        c.message_template, 
        c.user_id,
        e.username as user_email
      FROM campaigns c
      LEFT JOIN employees e ON c.user_id = e.user_id
      WHERE c.id = $1
    `;

    const queryParams = [id];

    // Add user filter if user_id exists
    if (user_id) {
      query += ` AND c.user_id = $2`;
      queryParams.push(user_id);
    }

    const campaignResult = await pool.query(query, queryParams);

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const campaign = campaignResult.rows[0];

    // Rest of your existing query logic...
    const statusResult = await pool.query(
      `SELECT delivered, failed, queued
       FROM campaigns 
       WHERE id = $1`,
      [id]
    );

    const contactsResult = await pool.query(
      `SELECT first_name, last_name, phone_number 
       FROM campaign_target_lists WHERE campaign_id = $1`,
      [id]
    );
    campaign.contacts = contactsResult.rows;

    res.json({
      ...campaign,
      report: statusResult.rows[0],
      contacts: campaign.contacts
    });

  } catch (error) {
    console.error("Error fetching campaign details:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new campaign
router.post('/upload', async (req, res) => {
  const { campaign_name, sender_id, message_template, contacts, scheduled_at, user_email } = req.body;

  console.log("Received data:", req.body);

  if (!campaign_name) {
    return res.status(400).json({ error: 'Campaign name is required.' });
  }

  if (!contacts || contacts.length === 0) {
    return res.status(400).json({ error: 'No contacts found in the request.' });
  }

  try {
    // First get the user_id from employees table
    const userResult = await pool.query(
      `SELECT user_id FROM employees WHERE username = $1`,
      [user_email]
    );
    
    const user_id = userResult.rows[0]?.user_id || null;
    console.log("Fetched user_id:", user_id);

    // Create the campaign
    const result = await pool.query(
      `INSERT INTO campaigns 
       (name, created_at, sender_phone_number, message_template, scheduled_at, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [campaign_name, new Date(), sender_id, message_template, scheduled_at || null, user_id]
    );
    
    const campaignId = result.rows[0].id;
    console.log("Inserted campaign ID:", campaignId, "with user_id:", user_id);

    // Process contacts and personalize messages
    const personalizedMessages = contacts.map(contact => {
      const message = message_template
        .replace(/\{\{first_name\}\}/g, contact.first_name || '')
        .replace(/\{\{last_name\}\}/g, contact.last_name || '');
      return {
        ...contact,
        message,
      };
    });

    // Store contacts in target list
    for (const contact of personalizedMessages) {
      await pool.query(
        `INSERT INTO campaign_target_lists 
         (campaign_id, first_name, last_name, phone_number, message, sender_phone_number)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [campaignId, contact.first_name, contact.last_name, contact.phone_number, contact.message, sender_id]
      );
    }

    // Prepare message data with user_id
    const bulkMessageData = {
      message: message_template,
      twilioNumber: sender_id,
      contacts: personalizedMessages,
      campaign_id: campaignId,
      user_id: user_id
    };

    // Handle scheduled campaigns
    if (scheduled_at) {
      const cronTime = new Date(scheduled_at);
      const cronExpression = `0 ${cronTime.getMinutes()} ${cronTime.getHours()} ${cronTime.getDate()} ${cronTime.getMonth() + 1} *`;

      cron.schedule(cronExpression, async () => {
        try {
          console.log(`Running scheduled campaign ${campaignId} at ${new Date()}`);
          
          const response = await axios.post(`${apiBaseUrl}/api/message/send-bulk`, bulkMessageData);
          console.log("Scheduled campaign sent:", response.data);
        } catch (error) {
          console.error("Error sending scheduled campaign:", error.response?.data || error.message);
        }
      });

      res.json({ 
        success: true, 
        message: 'Campaign scheduled successfully', 
        campaignId 
      });
    } else {
      // Send immediately
      const response = await axios.post(`${apiBaseUrl}/api/message/send-bulk`, bulkMessageData);
      console.log("Bulk message response:", response.data);

      res.json({ 
        success: true, 
        message: 'Campaign launched successfully', 
        campaignId 
      });
    }
  } catch (err) {
    console.error('❌ Error uploading campaign:', err.message);
    res.status(500).json({ error: 'Internal server error while uploading campaign' });
  }
});


export default router;