import * as controller from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

export async function authRoutes(app) {
  app.post('/register',        controller.register);
  app.post('/verify-email',    controller.verifyEmail);
  app.post('/login',           controller.login);
  app.post('/refresh',         controller.refresh);
  app.post('/logout',          controller.logout);
  app.post('/forgot-password', controller.forgotPassword);
  app.post('/reset-password',  controller.resetPassword);

  app.get('/me', { preHandler: [authenticate] }, async (req) => ({
    user: {
      id:        req.user.id,
      email:     req.user.email,
      role:      req.user.role,
      tenant_id: req.user.tenant_id,
    },
  }));
}
