import { pool } from '../index.js';

export async function getOrCreateEmployeeId(email) {
  const adminEmail = 'jp@ptechpartners.com'; // 👈 replace with your actual admin email

  const res = await pool.query('SELECT user_id FROM sms_platform.employees WHERE email = $1', [email]);
  if (res.rows.length > 0) return res.rows[0].user_id;

  const nextRes = await pool.query('SELECT MAX(user_id) FROM sms_platform.employees WHERE user_id > 0');
  const nextUserId = (nextRes.rows[0].max || 0) + 1;
  const assignedId = email === adminEmail ? 0 : nextUserId;

  await pool.query('INSERT INTO sms_platform.employees (email, user_id) VALUES ($1, $2)', [email, assignedId]);
  return assignedId;
}
