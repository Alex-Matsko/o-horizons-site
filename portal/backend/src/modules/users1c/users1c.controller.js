import * as svc from './users1c.service.js';

export async function listUsers(req, reply) {
  try {
    const users = await svc.listUsers(req.user.tenantId, req.params.dbId);
    return reply.send({ users });
  } catch (e) {
    return reply.code(400).send({ error: e.message });
  }
}

export async function createUser(req, reply) {
  try {
    const user = await svc.createUser(req.user.tenantId, req.params.dbId, req.body);
    return reply.code(201).send({ ok: true, user });
  } catch (e) {
    return reply.code(400).send({ error: e.message });
  }
}

export async function updateUser(req, reply) {
  try {
    const user = await svc.updateUser(req.user.tenantId, req.params.dbId, req.params.username, req.body);
    return reply.send({ ok: true, user });
  } catch (e) {
    return reply.code(400).send({ error: e.message });
  }
}

export async function deleteUser(req, reply) {
  try {
    await svc.deleteUser(req.user.tenantId, req.params.dbId, req.params.username);
    return reply.send({ ok: true });
  } catch (e) {
    return reply.code(400).send({ error: e.message });
  }
}
