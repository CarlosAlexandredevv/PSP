import { describe, expect, it } from '@jest/globals';

import {
  listTransactionsQuerySchema,
  listTransactionsResponseSchema,
} from './list-transactions.dto';

describe('listTransactionsQuerySchema', () => {
  it('aplica defaults de page e limit', () => {
    const result = listTransactionsQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        page: 1,
        limit: 10,
      });
    }
  });

  it('aceita filtros válidos', () => {
    const result = listTransactionsQuerySchema.safeParse({
      page: '2',
      limit: '5',
      method: 'pix',
      cpf: '12345678900',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        page: 2,
        limit: 5,
        method: 'pix',
        cpf: '12345678900',
      });
    }
  });

  it('rejeita query inválida', () => {
    const result = listTransactionsQuerySchema.safeParse({
      page: 0,
      limit: 101,
      cpf: '123',
    });

    expect(result.success).toBe(false);
  });
});

describe('listTransactionsResponseSchema', () => {
  it('aceita response válida', () => {
    const result = listTransactionsResponseSchema.safeParse({
      transactions: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          amount: 2_099,
          description: 'Cafe',
          method: 'pix',
          payerName: 'John Doe',
          payerCpf: '12345678900',
          cardLast4: null,
          createdAt: new Date('2026-04-24T10:00:00.000Z'),
          updatedAt: new Date('2026-04-24T10:00:00.000Z'),
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejeita response com paginação inválida', () => {
    const result = listTransactionsResponseSchema.safeParse({
      transactions: [],
      pagination: {
        page: 0,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });

    expect(result.success).toBe(false);
  });
});
