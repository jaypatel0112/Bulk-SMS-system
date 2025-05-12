import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase
  },
};

let pool;

export const getPool = () => {
  if (!pool) {
    try {
      pool = new Pool(poolConfig);
      
      // Verify connection immediately
      pool.on('connect', () => {
        console.log('✅ Database pool created');
      });
      
      pool.on('error', (err) => {
        console.error('❌ Database pool error:', err);
      });
      
    } catch (err) {
      console.error('❌ Failed to create database pool:', err);
      throw err;
    }
  }
  return pool;
};

// Test connection helper
export const testConnection = async () => {
  const testPool = getPool();
  try {
    const res = await testPool.query('SELECT NOW()');
    console.log('✅ Database connection successful at:', res.rows[0].now);
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    return false;
  }
};

const query = (text, params) => getPool().query(text, params);
export { query }; // ✅ Named export