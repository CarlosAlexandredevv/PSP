import fastify, { type FastifyError } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  type ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { z } from 'zod';

import { UnprocessableEntityError } from './shared/errors/unprocessable-entity.error';
import { transactionRoutes } from './modules/transaction/http/routes';

const isDev = process.env.NODE_ENV !== 'production';

export const app = fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? (isDev ? 'info' : 'warn'),
    redact: {
      paths: ['req.body.card_number', 'req.body.cvv', 'req.body.valid'],
      censor: '[REDACTED]',
    },
    ...(isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
            },
          },
        }
      : {}),
  },
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(fastifySwagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Challenger - PSP API',
      description:
        'API RESTful para processar transacoes (cash-in), gerar recebiveis (payables) com fee e consultar saldo consolidado.',
      version: '1.0.0',
    },
    tags: [
      { name: 'health', description: 'Verificacao de saude' },
      {
        name: 'transaction',
        description: 'Transacoes, recebiveis e saldo (regras de fee, D+0 e D+15)',
      },
    ],
  },
  transform: jsonSchemaTransform,
});

app.register(async (instance) => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const { default: fastifyApiReference } = await import('@scalar/fastify-api-reference');

  await instance.register(fastifyApiReference, {
    routePrefix: '/docs',
    configuration: {
      theme: 'purple',
      title: 'PSP API Docs',
    },
    openApiDocumentEndpoints: {
      json: '/json',
      yaml: '/yaml',
    },
  });
});

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

app.register(async (instance) => {
  instance.withTypeProvider<ZodTypeProvider>().get(
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

  await instance.register(transactionRoutes);
});
