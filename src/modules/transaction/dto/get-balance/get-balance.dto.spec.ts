import { describe, expect, it } from '@jest/globals';

import { getBalanceResponseSchema } from './get-balance.dto';

describe('getBalanceResponseSchema', () => {
  it('aceita response de saldo válida', () => {
    const result = getBalanceResponseSchema.safeParse({
      balance: {
        available: 1_940,
        waiting_funds: 9_101,
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejeita response com valores inválidos', () => {
    const result = getBalanceResponseSchema.safeParse({
      balance: {
        available: -1,
        waiting_funds: 2.5,
      },
    });

    expect(result.success).toBe(false);
  });
});
