import * as svc from './tariffs.service.js';

export async function listTariffs(req, reply) {
  const tariffs = await svc.getTariffs();
  return reply.send({ tariffs });
}

export async function getTariff(req, reply) {
  const tariff = await svc.getTariffById(req.params.id);
  if (!tariff) return reply.code(404).send({ error: 'Not found' });
  return reply.send({ tariff });
}

export async function getMyTariff(req, reply) {
  const tariff = await svc.getTenantTariff(req.user.tenantId);
  return reply.send({ tariff });
}

export async function switchTariff(req, reply) {
  try {
    const tariff = await svc.changeTariff(req.user.tenantId, req.body.tariff_id);
    return reply.send({ ok: true, tariff });
  } catch (e) {
    return reply.code(400).send({ error: e.message });
  }
}
