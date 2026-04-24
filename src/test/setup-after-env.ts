import { db } from '../lib/db';

afterAll(async () => {
  await db.end().catch(() => {
    // Ignora caso o pool já tenha sido encerrado neste worker.
  });
});
