import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('DATABASE_URL is set:', Boolean(process.env.DATABASE_URL));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const query = async (text: string, params?: any[]) => {
  const result = await pool.query(text, params);
  return result;
};

export default pool;