import { startWorker } from './worker';

startWorker().catch((error) => {
  console.error(error);
  process.exit(1);
});
