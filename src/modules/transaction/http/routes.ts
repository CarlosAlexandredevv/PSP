import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  createTransactionBodySchema,
  createTransactionResponseSchema,
  type CreateTransactionBody,
} from '../dto/create-transaction/create-transaction.dto';
import { getBalanceResponseSchema } from '../dto/get-balance/get-balance.dto';
import {
  listTransactionsQuerySchema,
  listTransactionsResponseSchema,
  type ListTransactionsQuery,
} from '../dto/list-transactions/list-transactions.dto';
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

  app.withTypeProvider<ZodTypeProvider>().get(
    '/transactions',
    {
      schema: {
        tags: ['transaction'],
        querystring: listTransactionsQuerySchema,
        response: {
          200: listTransactionsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { page, limit, method, cpf } = request.query as ListTransactionsQuery;
      const serviceInput = {
        page,
        limit,
        ...(method ? { method } : {}),
        ...(cpf ? { cpf } : {}),
      };
      const result = await transactionService.list({
        ...serviceInput,
      });

      return reply.status(200).send(result);
    },
  );

  app.withTypeProvider<ZodTypeProvider>().get(
    '/balance',
    {
      schema: {
        tags: ['transaction'],
        response: {
          200: getBalanceResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const result = await transactionService.getBalance();
      return reply.status(200).send(result);
    },
  );
}
