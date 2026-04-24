import fastify, { type FastifyError } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  type ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { z } from 'zod';

import { UnprocessableEntityError } from './shared/errors/unprocessable-entity.error';
import { transactionRoutes } from './modules/transaction/http/routes';

export const app = fastify({
  logger: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.setErrorHandler((error: FastifyError, _request, reply) => {
  if (hasZodFastifySchemaValidationErrors(error)) {
    const issues = error.validation.map((issue) => ({
      field: issue.instancePath.replace('/', '') || 'body',
      message: issue.message,
    }));

    return reply.status(422).send({
      message: 'Entidade não processável.',
      errors: issues,
    });
  }

  if (error instanceof UnprocessableEntityError) {
    return reply.status(error.statusCode).send({
      message: error.message,
      errors: error.issues,
    });
  }

  return reply.status(error.statusCode ?? 500).send({
    message: error.message,
  });
});

app.withTypeProvider<ZodTypeProvider>().get(
  '/health',
  {
    schema: {
      tags: ['health'],
      response: {
        200: z.object({
          status: z.literal('ok'),
        }),
      },
    },
  },
  async () => {
    return { status: 'ok' as const };
  },
);

app.register(async (instance) => {
  await instance.register(transactionRoutes);
});
