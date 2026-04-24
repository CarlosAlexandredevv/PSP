import { z } from 'zod';

export const getBalanceResponseSchema = z.object({
  balance: z.object({
    available: z.number().int().min(0),
    waiting_funds: z.number().int().min(0),
  }),
});
