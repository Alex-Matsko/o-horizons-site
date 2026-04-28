'use strict';

const { config } = require('./index.js');

// BullMQ connection object — used directly as `connection` in Queue/Worker/QueueEvents
const redisConfig = {
  host:     config.redis.host,
  port:     config.redis.port,
  password: config.redis.password || undefined,
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,    // required by BullMQ
};

// Named export expected by queues/index.js and worker.js
module.exports = { redis: redisConfig, redisConfig };
