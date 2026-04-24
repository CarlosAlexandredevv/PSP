import { z } from 'zod';

export const transactionSchema = z.object({
  id: z.uuid().describe('Identificador unico da transacao.'),
  amount: z.number().int().positive().describe('Valor bruto da transacao em centavos.'),
  description: z.string().describe('Descricao informada pelo pagador/cliente.'),
  method: z
    .enum(['pix', 'credit_card'])
    .describe('Metodo de pagamento utilizado na transacao.'),
  payerName: z.string().describe('Nome do pagador.'),
  payerCpf: z.string().describe('CPF do pagador com 11 digitos numericos.'),
  cardLast4: z
    .string()
    .nullable()
    .describe('Apenas os 4 ultimos digitos do cartao (PCI DSS). Nulo para PIX.'),
  createdAt: z.date().describe('Data de criacao da transacao.'),
  updatedAt: z.date().describe('Data da ultima atualizacao da transacao.'),
});
