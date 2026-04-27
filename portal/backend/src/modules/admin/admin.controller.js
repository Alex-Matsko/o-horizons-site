import * as svc from './admin.service.js';

export async function getStats(req, reply) {
  const stats = await svc.getStats();
  return reply.send({ stats });
}

export async function listTenants(req, reply) {
  const result = await svc.listTenants(req.query);
  return reply.send(result);
}

export async function listPendingDatabases(req, reply) {
  const databases = await svc.listPendingDatabases();
  return reply.send({ databases });
}

export async function approveDatabase(req, reply) {
  try {
    await svc.approveDatabase(req.params.id);
    return reply.send({ ok: true });
  } catch (e) {
    return reply.code(400).send({ error: e.message });
  }
}

export async function rejectDatabase(req, reply) {
  try {
    await svc.rejectDatabase(req.params.id, req.body?.reason);
    return reply.send({ ok: true });
  } catch (e) {
    return reply.code(400).send({ error: e.message });
  }
}

export async function setUserRole(req, reply) {
  try {
    await svc.setUserRole(req.params.id, req.body.role);
    return reply.send({ ok: true });
  } catch (e) {
    return reply.code(400).send({ error: e.message });
  }
}
