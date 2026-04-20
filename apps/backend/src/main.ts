import { buildServer } from './server';

async function bootstrap() {
  const server = await buildServer();
  const port = Number(process.env.API_PORT ?? 3001);
  const host = process.env.API_HOST ?? '0.0.0.0';

  await server.listen({ port, host });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
