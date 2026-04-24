import { z } from 'zod';

export const transactionSchema = z.object({
  id: z.uuid(),
  amount: z.number().int().positive(),
  description: z.string(),
  method: z.enum(['pix', 'credit_card']),
  payerName: z.string(),
  payerCpf: z.string(),
  cardLast4: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
