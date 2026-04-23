import fastify from 'fastify';
import {
  type ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { z } from 'zod';

export const app = fastify({
  logger: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

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
