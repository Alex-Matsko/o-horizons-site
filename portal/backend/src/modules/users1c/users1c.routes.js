import { listUsers, createUser, updateUser, deleteUser } from './users1c.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

export default async function users1cRoutes(fastify) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/databases/:dbId/users', listUsers);
  fastify.post('/databases/:dbId/users', createUser);
  fastify.patch('/databases/:dbId/users/:username', updateUser);
  fastify.delete('/databases/:dbId/users/:username', deleteUser);
}
