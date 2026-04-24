import { z } from 'zod';

import { transactionSchema } from '../transaction/transaction.dto';

export const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).describe('Pagina atual (minimo 1).'),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe('Quantidade de itens por pagina (1 a 100).'),
  method: z.enum(['pix', 'credit_card']).optional().describe('Filtro por metodo de pagamento.'),
  cpf: z
    .string({ error: 'cpf deve ser string numérica.' })
    .regex(/^[0-9]{11}$/, { error: 'cpf deve conter 11 dígitos numéricos.' })
    .describe('Filtro por CPF do pagador (11 digitos numericos).')
    .optional(),
});

export const listTransactionsResponseSchema = z.object({
  transactions: z.array(transactionSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  }),
});

export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
