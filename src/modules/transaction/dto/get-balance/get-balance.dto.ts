import { z } from 'zod';

export const getBalanceResponseSchema = z.object({
  balance: z.object({
    available: z
      .number()
      .int()
      .min(0)
      .describe('Saldo disponivel (payables com status paid), em centavos.'),
    waiting_funds: z
      .number()
      .int()
      .min(0)
      .describe('Saldo a receber (payables com status waiting_funds), em centavos.'),
  }),
});
