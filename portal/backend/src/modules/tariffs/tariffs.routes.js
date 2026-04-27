import { listTariffs, getTariff, getMyTariff, switchTariff } from './tariffs.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

export default async function tariffRoutes(fastify) {
  fastify.get('/tariffs', listTariffs);
  fastify.get('/tariffs/:id', getTariff);
  fastify.get('/me/tariff', { preHandler: [requireAuth] }, getMyTariff);
  fastify.post('/me/tariff', { preHandler: [requireAuth] }, switchTariff);
}
