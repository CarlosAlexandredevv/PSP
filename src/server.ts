import { app } from './app';
import { db } from './lib/db';

async function bootstrap() {
  await db.query('SELECT 1');

  const port = parseInt(process.env.PORT ?? '3001');

  await app.listen({
    host: '127.0.0.1',
    port,
  });

  console.log(`🚀 HTTP Server Running at http://127.0.0.1:${port}`);
}

bootstrap().catch((error) => {
  console.error('Erro ao iniciar aplicação:', error);
  process.exit(1);
});
