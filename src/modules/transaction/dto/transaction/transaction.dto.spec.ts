import { describe, expect, it } from '@jest/globals';

import { transactionSchema } from './transaction.dto';

describe('transactionSchema', () => {
  it('aceita transaction válida', () => {
    const result = transactionSchema.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      amount: 2_099,
      description: 'Cafe',
      method: 'pix',
      payerName: 'John Doe',
      payerCpf: '12345678900',
      cardLast4: null,
      createdAt: new Date('2026-04-24T10:00:00.000Z'),
      updatedAt: new Date('2026-04-24T10:00:00.000Z'),
    });

    expect(result.success).toBe(true);
  });

  it('rejeita amount inválido', () => {
    const result = transactionSchema.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      amount: 0,
      description: 'Cafe',
      method: 'pix',
      payerName: 'John Doe',
      payerCpf: '12345678900',
      cardLast4: null,
      createdAt: new Date('2026-04-24T10:00:00.000Z'),
      updatedAt: new Date('2026-04-24T10:00:00.000Z'),
    });

    expect(result.success).toBe(false);
  });
});
