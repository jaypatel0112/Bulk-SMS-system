import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  },
});

// Test the connection right when pool is created
pool.connect()
  .then(client => {
    console.log('✅ Database connected');
    client.release(); // release the connection back to the pool
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1); // stop the server if DB fails
  });
export { pool };