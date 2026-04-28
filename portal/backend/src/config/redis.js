import { config } from './index.js';

// BullMQ connection object — maxRetriesPerRequest:null and enableReadyCheck:false are required by BullMQ
export const redis = {
  host:                 config.redis.host,
  port:                 config.redis.port,
  password:             config.redis.password || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck:     false,
};
