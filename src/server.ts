import { app } from './app';
import { db } from './lib/db';

async function bootstrap() {
  await db.query('SELECT 1');

  const port = parseInt(process.env.PORT ?? '3001');

  await app.listen({
    host: process.env.HOST ?? '0.0.0.0',
    port,
  });

  console.log(`🚀 HTTP Server Running at http://localhost:${port}`);
  console.log(`📚 Documentacao (Scalar) disponivel em http://localhost:${port}/docs`);
}

bootstrap().catch((error) => {
  console.error('Erro ao iniciar aplicação:', error);
  process.exit(1);
});
