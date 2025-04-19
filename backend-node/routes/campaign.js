import express from 'express';
import { pool } from '../index.js';
import axios from 'axios';

const router = express.Router();

// ✅ POST /api/campaign/upload - Upload a campaign and send messages
router.post('/upload', async (req, res) => {
    const { campaign_name, sender_id, message_template, contacts } = req.body;

    console.log("Received data:", req.body);

    if (!campaign_name) {
        return res.status(400).json({ error: 'Campaign name is required.' });
    }

    if (!contacts || contacts.length === 0) {
        return res.status(400).json({ error: 'No contacts found in the request.' });
    }

    try {
        // 1. Insert campaign
        const result = await pool.query(
            `INSERT INTO campaigns (name, created_at, sender_phone_number, message_template) 
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [campaign_name, new Date(), sender_id, message_template]
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

        // 3. Call internal bulk message API
        const bulkMessageData = {
            message: message_template,
            twilioNumber: sender_id,
            contacts: personalizedMessages,
        };

        try {
            const response = await axios.post('http://localhost:5000/api/message/send-bulk', bulkMessageData);
            console.log("Bulk message response:", response.data);
        } catch (error) {
            console.error("Error sending bulk messages:", error.response?.data || error.message);
            return res.status(500).json({ error: 'Internal server error while sending messages' });
        }

        res.json({ success: true, message: 'Campaign launched successfully', campaignId });
    } catch (err) {
        console.error('❌ Error uploading campaign:', err.message);
        res.status(500).json({ error: 'Failed to upload campaign' });
    }
});

// ✅ GET /api/campaign - Fetch all campaigns
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name AS campaign_name, sender_phone_number, created_at 
            FROM campaigns 
            ORDER BY created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching campaigns:', err.message);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});

// ✅ GET /api/campaign/:id - Fetch campaign details with message and contacts
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(`
            SELECT c.id AS campaign_id, c.name AS campaign_name, c.sender_phone_number, c.created_at,  c.message_template,
                   COALESCE(json_agg(
                       json_build_object(
                           'first_name', cc.first_name,
                           'last_name', cc.last_name,
                           'phone_number', cc.phone_number,
                           'message', cc.message,
                           'sender_phone_number', cc.sender_phone_number,
                           'created_at', cc.created_at
                       )
                   ) FILTER (WHERE cc.id IS NOT NULL), '[]') AS contacts
            FROM campaigns c
            LEFT JOIN campaign_target_lists cc ON c.id = cc.campaign_id
            WHERE c.id = $1
            GROUP BY c.id
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching campaign details:', err.message);
        res.status(500).json({ error: 'Failed to fetch campaign details' });
    }
});

export default router;
