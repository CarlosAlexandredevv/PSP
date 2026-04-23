import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { db } from '../../lib/db';

const migrationPath = path.resolve(process.cwd(), 'db/migrations/001_init.sql');

export function hasTestDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export async function resetDatabaseSchema() {
  const sql = await readFile(migrationPath, 'utf-8');

  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await db.query(sql);
}
