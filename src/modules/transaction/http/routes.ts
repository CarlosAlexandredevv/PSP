import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  createTransactionBodySchema,
  createTransactionResponseSchema,
  type CreateTransactionBody,
} from '../dto/create-transaction.dto';
import { TransactionService } from '../services/transaction.service';

export async function transactionRoutes(app: FastifyInstance) {
  const transactionService = new TransactionService();

  app.withTypeProvider<ZodTypeProvider>().post(
    '/transaction',
    {
      schema: {
        tags: ['transaction'],
        body: createTransactionBodySchema,
        response: {
          201: createTransactionResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { amount, description, method, name, cpf, card_number, valid, cvv } =
        request.body as CreateTransactionBody;

      const serviceInput = {
        amount,
        description,
        method,
        name,
        cpf,
        ...(card_number ? { cardNumber: card_number } : {}),
        ...(valid ? { valid } : {}),
        ...(cvv ? { cvv } : {}),
      };

      const result = await transactionService.create(serviceInput);
      return reply.status(201).send(result);
    },
  );
}
