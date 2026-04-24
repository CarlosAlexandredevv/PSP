import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';

import { db } from '../../../../lib/db';
import { resetDatabaseSchema } from '../../../../test/helpers/database';
import { TransactionService } from '../../services/transaction.service';
import { PayableRepository } from './payable.repository';
import { TransactionRepository } from '../transaction/transaction.repository';

describe('PayableRepository e transação (integração)', () => {
  const transactionRepository = new TransactionRepository();
  const payableRepository = new PayableRepository();
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

  afterAll(async () => {
    if (dbAvailable) {
      await db.end();
    }
  });

  it('cria payable e mantém consistência gross = fee + net', async () => {
    if (!dbAvailable) return;

    const client = await db.connect();
    try {
      const transaction = await transactionRepository.create(client, {
        id: '22222222-2222-4222-8222-222222222222',
        amount: 1_000,
        description: 'Cafe',
        method: 'pix',
        payerName: 'John Doe',
        payerCpf: '12345678901',
        cardLast4: null,
      });

      const payable = await payableRepository.create(client, {
        id: '33333333-3333-4333-8333-333333333333',
        transactionId: transaction.id,
        grossAmount: 1_000,
        feeAmount: 30,
        netAmount: 970,
        feePercentage: 2.99,
        status: 'paid',
        paymentDate: new Date('2026-04-23T00:00:00.000Z'),
      });

      expect(payable.grossAmount).toBe(payable.feeAmount + payable.netAmount);
    } finally {
      client.release();
    }
  });

  it('faz rollback e não deixa transaction órfã quando payable falha', async () => {
    if (!dbAvailable) return;

    const service = new TransactionService(transactionRepository, {
      create: async () => {
        throw new Error('falha-forcada');
      },
    } as never);

    await expect(
      service.create({
        amount: 1_500,
        description: 'Fone',
        method: 'pix',
        name: 'Joao',
        cpf: '12345678902',
      }),
    ).rejects.toThrow('falha-forcada');

    const result = await db.query<{ total: string }>(
      'SELECT COUNT(*)::text AS total FROM transactions WHERE payer_cpf = $1',
      ['12345678902'],
    );
    expect(result.rows[0]?.total).toBe('0');
  });
});
