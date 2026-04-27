import * as svc from './backups.service.js';

export async function listBackups(req, reply) {
  try {
    const backups = await svc.listBackups(req.user.tenantId, req.params.dbId);
    return reply.send({ backups });
  } catch (e) {
    return reply.code(400).send({ error: e.message });
  }
}

export async function createBackup(req, reply) {
  try {
    const backup = await svc.createBackup(req.user.tenantId, req.params.dbId);
    return reply.code(202).send({ ok: true, backup });
  } catch (e) {
    return reply.code(400).send({ error: e.message });
  }
}

export async function deleteBackup(req, reply) {
  try {
    await svc.deleteBackup(req.user.tenantId, req.params.id);
    return reply.send({ ok: true });
  } catch (e) {
    return reply.code(400).send({ error: e.message });
  }
}

export async function downloadBackup(req, reply) {
  try {
    const filePath = await svc.getBackupDownloadUrl(req.user.tenantId, req.params.id);
    return reply.send({ download_url: filePath });
  } catch (e) {
    return reply.code(400).send({ error: e.message });
  }
}
