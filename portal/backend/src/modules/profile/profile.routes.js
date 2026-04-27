import { getProfile, updateProfile, changePassword } from './profile.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

export default async function profileRoutes(fastify) {
  fastify.addHook('preHandler', requireAuth);

  fastify.get('/me', getProfile);
  fastify.patch('/me', updateProfile);
  fastify.post('/me/change-password', changePassword);
}
