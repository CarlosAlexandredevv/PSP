import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { db } from '../lib/db';

async function migrate() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const migrationPath = path.resolve(__dirname, '../../db/migrations/001_init.sql');

  const sql = await readFile(migrationPath, 'utf-8');
  await db.query(sql);

  console.log('Migracao 001_init.sql aplicada com sucesso.');
}

migrate()
  .catch((error) => {
    console.error('Erro ao aplicar migracao:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });
