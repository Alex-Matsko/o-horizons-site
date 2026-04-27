import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import * as controller from './databases.controller.js';

export async function databasesRoutes(app) {
  app.addHook('preHandler', authenticate);

  app.get('/',    controller.listDatabases);
  app.get('/:id', controller.getDatabase);
  app.post('/',   controller.requestDatabase);
}
