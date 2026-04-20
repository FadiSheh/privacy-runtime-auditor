import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import type { ScanJob } from '@pra/shared';

import { getConfig } from '../config';

export const scanQueueName = 'pra-scan-queue';

type ScanQueueLike = Pick<Queue<ScanJob>, 'add'>;

let queue: ScanQueueLike | null = null;

export function getRedisConnection() {
  return new IORedis(getConfig().REDIS_URL, {
    maxRetriesPerRequest: null,
  });
}

export function getScanQueue(): ScanQueueLike {
  if (queue) {
    return queue;
  }

  if (getConfig().REDIS_URL === 'memory') {
    queue = {
      add: async (_name, data) => ({ id: data.id } as Awaited<ReturnType<Queue<ScanJob>['add']>>),
    };
    return queue;
  }

  queue = new Queue<ScanJob>(scanQueueName, {
    connection: getRedisConnection(),
  });

  return queue;
}
