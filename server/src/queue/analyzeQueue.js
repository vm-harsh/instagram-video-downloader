import { Queue, QueueEvents } from 'bullmq';
import { redis } from '../redis/client.js';

export const ANALYZE_QUEUE_NAME = 'instagram-analyze';

export const analyzeQueue = new Queue(ANALYZE_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1500
    },
    removeOnComplete: {
      age: 3600,
      count: 1000
    },
    removeOnFail: {
      age: 86400,
      count: 5000
    }
  }
});

export const analyzeQueueEvents = new QueueEvents(ANALYZE_QUEUE_NAME, {
  connection: redis.duplicate()
});
