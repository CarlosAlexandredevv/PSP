import { z } from 'zod';

export const createTransactionBodySchema = z
  .object({
    amount: z
      .number({ error: 'amount deve ser numérico.' })
      .int({ error: 'amount deve ser um inteiro em centavos.' })
      .positive({ error: 'amount deve ser maior que zero.' }),
    description: z
      .string({ error: 'description deve ser string.' })
      .trim()
      .min(1, { error: 'description é obrigatória.' }),
    method: z.enum(['pix', 'credit_card'], {
      error: 'method deve ser pix ou credit_card.',
    }),
    name: z
      .string({ error: 'name deve ser string.' })
      .trim()
      .min(1, { error: 'name é obrigatório.' }),
    cpf: z
      .string({ error: 'cpf deve ser string numérica.' })
      .regex(/^[0-9]{11}$/, { error: 'cpf deve conter 11 dígitos numéricos.' }),
    card_number: z
      .string({ error: 'card_number deve ser string numérica.' })
      .regex(/^[0-9]+$/, { error: 'card_number deve conter apenas números.' })
      .optional(),
    valid: z
      .string({ error: 'valid deve ser string numérica.' })
      .regex(/^[0-9]{4}$/, { error: 'valid deve estar no formato MMAA.' })
      .optional(),
    cvv: z
      .string({ error: 'cvv deve ser string numérica.' })
      .regex(/^[0-9]{3,4}$/, {
        error: 'cvv deve conter 3 ou 4 dígitos numéricos.',
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.method === 'credit_card') {
      if (!value.card_number) {
        ctx.addIssue({
          code: 'custom',
          message: 'card_number é obrigatório para credit_card.',
          path: ['card_number'],
        });
      }
      if (!value.valid) {
        ctx.addIssue({
          code: 'custom',
          message: 'valid é obrigatório para credit_card.',
          path: ['valid'],
        });
      }
      if (!value.cvv) {
        ctx.addIssue({
          code: 'custom',
          message: 'cvv é obrigatório para credit_card.',
          path: ['cvv'],
        });
      }
      return;
    }

    if (value.card_number || value.valid || value.cvv) {
      ctx.addIssue({
        code: 'custom',
        message: 'card_number, valid e cvv não devem ser enviados para pix.',
        path: ['method'],
      });
    }
  });

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

export const createTransactionResponseSchema = z.object({
  transaction: transactionSchema,
});

export const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  method: z.enum(['pix', 'credit_card']).optional(),
  cpf: z
    .string({ error: 'cpf deve ser string numérica.' })
    .regex(/^[0-9]{11}$/, { error: 'cpf deve conter 11 dígitos numéricos.' })
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

export type CreateTransactionBody = z.infer<typeof createTransactionBodySchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
