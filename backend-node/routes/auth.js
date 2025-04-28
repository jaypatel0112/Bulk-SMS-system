import { Router } from 'express';
const router = Router();
import { query } from '../db/index.js'; // Ensure this points to the correct file

// Signup route for employee
router.post('/signup', async (req, res) => {
    const { username, password, role } = req.body;

    try {
        // Verify connection by running a test query
        await query('SELECT 1 FROM employees LIMIT 1');
        
        // Check for existing user
        const checkUser = await query(
            `SELECT 1 FROM employees WHERE username = $1 LIMIT 1`,
            [username]
        );

        if (checkUser.rows.length > 0) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        let user_id = null;
        
        // If the role is 'user', assign a user_id
        if (role === 2) {
            // Get the next available user_id
            const userIdResult = await query(
                `SELECT COALESCE(MAX(user_id), 0) + 1 AS next_user_id FROM employees WHERE role = 2`
            );
            user_id = userIdResult.rows[0].next_user_id;
        }

        // Insert new user with or without user_id
        const result = await query(
            `INSERT INTO employees (user_id, username, password, role) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, user_id, username, role`,
            [user_id, username, password, role]
        );

        res.status(201).json({
            message: 'User created successfully',
            user: result.rows[0],
        });
    } catch (error) {
        console.error('Full error object:', error);
        res.status(500).json({ 
            message: 'Database operation failed',
            error: {
                code: error.code,
                message: error.message,
                detail: error.detail
            }
        });
    }
});



// Login route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const result = await query('SELECT * FROM employees WHERE username = $1', [username]);
      const user = result.rows[0];
  
      if (!user) {
        return res.status(400).json({ message: 'User not found' });
      }
  
      if (user.password !== password) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
  
      // 👇 Send back user info including user_id
      return res.status(200).json({
        message: 'Login successful',
        user: {
          id: user.id,
          user_id: user.user_id, // 👈 this is what you'll use for future queries
          username: user.username,
          role: user.role,
        },
      });
  
    } catch (error) {
      console.error('Error during login:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });


export default router;
