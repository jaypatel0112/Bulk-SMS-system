// backend-node/controllers/authController.js

import pool from '../db/index.js';  // PostgreSQL pool
import bcrypt from 'bcrypt';

export const signup = async (req, res) => {
  const { username, email, password, first_name, last_name } = req.body;

  try {
    // Check if the username or email already exists in the database
    const existingUser = await pool.query(
      `SELECT * FROM users WHERE username = $1 OR email = $2`,
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or Email already exists' });
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [username, email, hashedPassword, first_name, last_name]
    );

    // Respond with the created user
    res.status(201).json({ message: 'User created successfully', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    // If the error is about duplicate key, respond with a specific message
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username or Email already exists' });
    }
    // General error handling
    res.status(500).json({ error: 'Something went wrong during signup' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1`, 
      [email]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    // Add JWT token logic here if needed
    res.json({ message: "Login successful", user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

