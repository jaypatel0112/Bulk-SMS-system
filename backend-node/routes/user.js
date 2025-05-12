import { Router } from 'express';
const router = Router();
import { query } from '../db/index.js'; // PostgreSQL connection

// ============================================
// 🔐 GET ROLE OF USER BY EMAIL
// ============================================
router.get('/role/:email', async (req, res) => {
    const email = decodeURIComponent(req.params.email);
  
    try {
      const result = await query(
        `SELECT role FROM sms_platform.employees WHERE username = $1`,
        [email]
      );
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      res.json({ role: result.rows[0].role });
    } catch (err) {
      console.error('Error fetching role:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });  



// Example: Get user info (optional)
router.get('/:email', async (req, res) => {
  const email = decodeURIComponent(req.params.email);

  try {
    const result = await query(
      `SELECT u.id, u.email, e.role
       FROM sms_platform.users u
       JOIN sms_platform.employees e ON u.id = e.user_id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user info:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ GET ALL USERS WITH role = 2
router.get('/role/2/all', async (req, res) => {
    try {
      const result = await query(
        `SELECT user_id, username AS email FROM sms_platform.employees WHERE role = 2`
      ); // Log the result for debugging);
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching users with role 2:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

export default router;
