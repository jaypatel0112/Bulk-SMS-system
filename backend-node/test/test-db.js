// backend/test/test-db.js

const db = require('../db'); // Changed to 'require'
async function testConnection() {
  const res = await db.query('SELECT NOW()');
  console.log(res.rows[0]);
}

testConnection();
