'use strict';

const { config } = require('./index.js');

const redisConfig = {
  host:     config.redis.host,
  port:     config.redis.port,
  password: config.redis.password || undefined,
};

module.exports = { redisConfig };
