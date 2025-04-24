import express from 'express';
import { pool } from '../index.js';
import axios from 'axios';
import cron from 'node-cron';

const router = express.Router();

const apiBaseUrl = process.env.BASE_API_URL;

// ✅ GET /api/campaign - Fetch all campaigns for Dashboard
router.get("/", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, name AS campaign_name, created_at FROM campaigns ORDER BY created_at DESC`
      );
      res.json(result.rows);
    } catch (err) {
      console.error("❌ Error fetching campaigns:", err.message);
      res.status(500).json({ error: "Internal server error while fetching campaigns" });
    }
  });

  //GET /api/campaign/:id - Fetch campaign details by ID
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      // 1. Get campaign basic info
      const campaignResult = await pool.query(
        `SELECT id, name as campaign_name, sender_phone_number, created_at, message_template 
         FROM campaigns WHERE id = $1`,
        [id]
      );
  
      if (campaignResult.rows.length === 0) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
  
      const campaign = campaignResult.rows[0];
  
      // 2. Get the campaign's message status counts directly from the database
      const statusResult = await pool.query(
        `SELECT delivered, failed, queued
         FROM campaigns 
         WHERE id = $1`,
        [id]
      );
  
      const statusCounts = statusResult.rows[0];
  
      // 3. Get campaign contacts
      const contactsResult = await pool.query(
        `SELECT first_name, last_name, phone_number 
         FROM campaign_target_lists WHERE campaign_id = $1`,
        [id]
      );
      campaign.contacts = contactsResult.rows;
  
      // 4. Get all messages for the campaign
      const messagesResult = await pool.query(
        `SELECT * FROM messages WHERE campaign_id = $1`,
        [id]
      );
      campaign.messages = messagesResult.rows;
  
      // 5. Send response with campaign data, status counts, and messages
      res.json({
        ...campaign,
        report: statusCounts, // Include the status counts in the response
        messages: campaign.messages,
      });
  
    } catch (error) {
      console.error("❌ Error fetching campaign details:", error.message);
      res.status(500).json({ error: 'Internal server error while fetching campaign details' });
    }
  });


// ✅ POST /api/campaign/upload - Upload a campaign and send messages
router.post('/upload', async (req, res) => {
    const { campaign_name, sender_id, message_template, contacts, scheduled_at } = req.body;

    console.log("Received data:", req.body);

    if (!campaign_name) {
        return res.status(400).json({ error: 'Campaign name is required.' });
    }

    if (!contacts || contacts.length === 0) {
        return res.status(400).json({ error: 'No contacts found in the request.' });
    }

    try {
        // 1. Insert campaign, use null for scheduled_at if not provided
        const result = await pool.query(
            `INSERT INTO campaigns (name, created_at, sender_phone_number, message_template, scheduled_at) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [campaign_name, new Date(), sender_id, message_template, scheduled_at || null]
        );
        const campaignId = result.rows[0].id;
        console.log("Inserted campaign ID:", campaignId);

        // 2. Personalize and insert contacts into campaign_target_lists
        const personalizedMessages = contacts.map(contact => {
            const message = message_template
                .replace('{{first_name}}', contact.first_name)
                .replace('{{last_name}}', contact.last_name);
            return {
                ...contact,
                message,
            };
        });

        // Insert into campaign_target_lists with sender_number and message
        for (const contact of personalizedMessages) {
            await pool.query(
                `INSERT INTO campaign_target_lists 
                 (campaign_id, first_name, last_name, phone_number, message, sender_phone_number)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [campaignId, contact.first_name, contact.last_name, contact.phone_number, contact.message, sender_id]
            );
        }

        // 3. If scheduled_at is provided, schedule the campaign
        if (scheduled_at) {
            const cronTime = new Date(scheduled_at);  // Convert scheduled time to Date
            const cronExpression = `0 ${cronTime.getMinutes()} ${cronTime.getHours()} ${cronTime.getDate()} ${cronTime.getMonth() + 1} *`;  // Cron expression format

            cron.schedule(cronExpression, async () => {
                try {
                    // Fetch the campaign details from the database
                    const result = await pool.query(
                        `SELECT * FROM campaigns WHERE id = $1`,
                        [campaignId]
                    );
                    const campaign = result.rows[0];

                    if (!campaign) {
                        console.error('❌ Campaign not found');
                        return;
                    }

                    // Fetch the target contacts for the campaign
                    const contactsResult = await pool.query(
                        `SELECT * FROM campaign_target_lists WHERE campaign_id = $1`,
                        [campaignId]
                    );
                    const contacts = contactsResult.rows;

                    // Send the campaign messages
                    const bulkMessageData = {
                        message: campaign.message_template,
                        twilioNumber: campaign.sender_phone_number,
                        contacts: contacts,
                        campaign_id: campaignId
                    };

                    try {
                        const response = await axios.post(`${apiBaseUrl}/api/message/send-bulk`, bulkMessageData);
                        console.log("Scheduled campaign sent:", response.data);
                    } catch (error) {
                        console.error("Error sending scheduled campaign:", error.response?.data || error.message);
                    }
                } catch (error) {
                    console.error("Error scheduling campaign:", error.message);
                }
            });
        } else {
            // If no schedule time, send immediately
            const bulkMessageData = {
                message: message_template,
                twilioNumber: sender_id,
                contacts: personalizedMessages,
                campaign_id: campaignId
            };

            try {
                const response = await axios.post(`${apiBaseUrl}/api/message/send-bulk`, bulkMessageData);
                console.log("Bulk message response:", response.data);
            } catch (error) {
                console.error("Error sending bulk messages:", error.response?.data || error.message);
                return res.status(500).json({ error: 'Internal server error while sending messages' });
            }
        }

        res.json({ success: true, message: scheduled_at ? 'Campaign scheduled successfully' : 'Campaign launched successfully', campaignId });
    } catch (err) {
        console.error('❌ Error uploading campaign:', err.message);
        res.status(500).json({ error: 'Internal server error while uploading campaign' });
    }
});


  



export default router;
