import * as svc from './profile.service.js';

export async function getProfile(req, reply) {
  const profile = await svc.getProfile(req.user.id);
  if (!profile) return reply.code(404).send({ error: 'Not found' });
  return reply.send({ profile });
}

export async function updateProfile(req, reply) {
  try {
    const profile = await svc.updateProfile(req.user.id, req.body);
    return reply.send({ ok: true, profile });
  } catch (e) {
    return reply.code(400).send({ error: e.message });
  }
}

export async function changePassword(req, reply) {
  try {
    await svc.changePassword(req.user.id, req.body);
    return reply.send({ ok: true });
  } catch (e) {
    return reply.code(400).send({ error: e.message });
  }
}
