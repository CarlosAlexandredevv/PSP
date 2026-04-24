import { z } from 'zod';

import { transactionSchema } from '../transaction/transaction.dto';

export const createTransactionBodySchema = z
  .object({
    amount: z
      .number({ error: 'amount deve ser numérico.' })
      .int({ error: 'amount deve ser um inteiro em centavos.' })
      .positive({ error: 'amount deve ser maior que zero.' })
      .describe('Valor da transacao em centavos. Ex.: 2099 representa R$ 20,99.'),
    description: z
      .string({ error: 'description deve ser string.' })
      .trim()
      .min(1, { error: 'description é obrigatória.' })
      .describe('Descricao da transacao. Ex.: "Airpods".'),
    method: z.enum(['pix', 'credit_card'], {
      error: 'method deve ser pix ou credit_card.',
    }).describe('Metodo de pagamento: pix ou credit_card.'),
    name: z
      .string({ error: 'name deve ser string.' })
      .trim()
      .min(1, { error: 'name é obrigatório.' })
      .describe('Nome do pagador.'),
    cpf: z
      .string({ error: 'cpf deve ser string numérica.' })
      .regex(/^[0-9]{11}$/, { error: 'cpf deve conter 11 dígitos numéricos.' })
      .describe('CPF do pagador com exatamente 11 digitos numericos.'),
    card_number: z
      .string({ error: 'card_number deve ser string numérica.' })
      .regex(/^[0-9]+$/, { error: 'card_number deve conter apenas números.' })
      .describe('Numero do cartao (obrigatorio para credit_card).')
      .optional(),
    valid: z
      .string({ error: 'valid deve ser string numérica.' })
      .regex(/^[0-9]{4}$/, { error: 'valid deve estar no formato MMAA.' })
      .describe('Validade do cartao no formato MMAA (obrigatorio para credit_card).')
      .optional(),
    cvv: z
      .string({ error: 'cvv deve ser string numérica.' })
      .regex(/^[0-9]{3,4}$/, {
        error: 'cvv deve conter 3 ou 4 dígitos numéricos.',
      })
      .describe('Codigo de verificacao do cartao (obrigatorio para credit_card).')
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

export const createTransactionResponseSchema = z.object({
  transaction: transactionSchema,
});

export type CreateTransactionBody = z.infer<typeof createTransactionBodySchema>;
