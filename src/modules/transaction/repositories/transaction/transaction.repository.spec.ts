import { beforeAll, beforeEach, describe, expect, it } from '@jest/globals';

import { db } from '../../../../lib/db';
import { resetDatabaseSchema } from '../../../../test/helpers/database';
import { TransactionRepository } from './transaction.repository';

describe('TransactionRepository (integração)', () => {
  const repository = new TransactionRepository();
  let dbAvailable = false;

  beforeAll(async () => {
    try {
      await db.query('SELECT 1');
      dbAvailable = true;
      await resetDatabaseSchema();
    } catch {
      dbAvailable = false;
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) return;
    await db.query('DELETE FROM payables');
    await db.query('DELETE FROM transactions');
  });

  it('cria transaction persistindo apenas card_last4 quando for cartão', async () => {
    if (!dbAvailable) return;

    const client = await db.connect();
    try {
      const transaction = await repository.create(client, {
        id: '11111111-1111-4111-8111-111111111111',
        amount: 10_000,
        description: 'Notebook',
        method: 'credit_card',
        payerName: 'Jane Doe',
        payerCpf: '12345678900',
        cardLast4: '1234',
      });

      expect(transaction.cardLast4).toBe('1234');
      const row = await client.query<{
        card_last4: string;
      }>('SELECT card_last4 FROM transactions WHERE id = $1', [transaction.id]);
      expect(row.rows[0]?.card_last4).toBe('1234');
    } finally {
      client.release();
    }
  });
});
