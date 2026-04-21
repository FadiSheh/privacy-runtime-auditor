import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import type { ScanJob } from '@pra/shared';

import { getConfig } from '../config';

export const scanQueueName = 'pra-scan-queue';

type ScanQueueLike = Pick<Queue<ScanJob>, 'add' | 'getJob' | 'remove'>;

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
    const memoryQueue: ScanQueueLike = {
      add: async (_name, data) => ({ id: data.id } as Awaited<ReturnType<Queue<ScanJob>['add']>>),
      getJob: async () => undefined,
      remove: async () => 0,
    };
    queue = memoryQueue;
    return memoryQueue;
  }

  const createdQueue = new Queue<ScanJob>(scanQueueName, {
    connection: getRedisConnection(),
  });
  queue = createdQueue;

  return createdQueue;
}
