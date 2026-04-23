import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL não foi definida no ambiente.');
}

export const db = new Pool({
  connectionString: databaseUrl,
});
