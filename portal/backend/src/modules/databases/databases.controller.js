import * as service from './databases.service.js';

export async function listDatabases(req, reply) {
  try {
    const isAdmin = req.user.role === 'SUPER_ADMIN';
    const rows = await service.listDatabases(req.user.tenant_id, isAdmin);
    reply.send(rows);
  } catch (err) {
    reply.code(err.statusCode || 500).send({ error: err.message });
  }
}

export async function getDatabase(req, reply) {
  try {
    const isAdmin = req.user.role === 'SUPER_ADMIN';
    const db = await service.getDatabase(req.params.id, req.user.tenant_id, isAdmin);
    reply.send(db);
  } catch (err) {
    reply.code(err.statusCode || 500).send({ error: err.message });
  }
}

export async function requestDatabase(req, reply) {
  try {
    const db = await service.requestDatabase(req.body, req.user);
    reply.code(201).send(db);
  } catch (err) {
    reply.code(err.statusCode || 500).send({ error: err.message });
  }
}
