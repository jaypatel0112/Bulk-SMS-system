import { Router } from 'express';
const router = Router();
import { query } from '../db/index.js';

// ✅ Assign a Twilio number to a user
router.post('/', async (req, res) => {
  const { phone_number, user_id } = req.body;

  try {
    const employeeResult = await query(
      `SELECT * FROM employees WHERE user_id = $1`,
      [user_id]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(400).json({ error: 'Employee not found. Please create the employee first.' });
    }

    const username = employeeResult.rows[0].username;

    const checkDuplicate = await query(
      `SELECT * FROM twilio_numbers WHERE phone_number = $1 AND username = $2`,
      [phone_number, username]
    );

    if (checkDuplicate.rows.length > 0) {
      return res.status(400).json({ error: `You are trying to assign the same Twilio number (${phone_number}) to the same employee (${username}) again.` });
    }

    const result = await query(
      `INSERT INTO twilio_numbers (phone_number, username, user_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [phone_number, username, user_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign number' });
  }
});

// ✅ Get all Twilio numbers (not tied to a user)
router.get('/', async (req, res) => {
  try {
    const result = await query(`SELECT phone_number, username FROM twilio_numbers`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch Twilio numbers' });
  }
});

// ✅ Get numbers assigned to a specific user by email
router.get('/user-numbers/:email', async (req, res) => {
  try {
    const employeeResult = await query(
      `SELECT user_id FROM employees WHERE username = $1`,
      [req.params.email]
    );
    console.log('Employee Result:', employeeResult.rows); // Log the result for debugging
    if (employeeResult.rows.length === 0) {
      return res.json({ numbers: [] });
    }

    const userId = employeeResult.rows[0].user_id;

    const numbersResult = await query(
      `SELECT phone_number FROM twilio_numbers WHERE user_id = $1`,
      [userId]
    );

    res.json({
      numbers: numbersResult.rows.map(row => row.phone_number)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user numbers' });
  }
});

// DELETE a Twilio number assigned to a user
router.delete('/', async (req, res) => {
  const { phone_number, username } = req.body;

  try {
    const result = await query(
      `DELETE FROM twilio_numbers WHERE phone_number = $1 AND username = $2 RETURNING *`,
      [phone_number, username]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Number not found or already deleted.' });
    }

    res.status(200).json({ message: 'Twilio number deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete number' });
  }
});


export default router;
