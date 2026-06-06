import Redlock from 'redlock';
import { getRedisConnection } from '../queue';
import { config } from '@/config';

const redisInstance = getRedisConnection()

export const lockManager = new Redlock(
  [redisInstance], 
  {
    driftFactor: config.REDLOCK_DRIFT_FACTOR, 
    retryCount: config.REDLOCK_RETRY_COUNT,    
    retryDelay: config.REDLOCK_RETRY_DELAY,   
    retryJitter: config.REDLOCK_RETRY_JITTER,   
  }
);