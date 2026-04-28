async function authenticate(req, reply) {
  try { await req.jwtVerify(); }
  catch { return reply.code(401).send({ error: 'Unauthorized' }); }
}

async function adminOnly(req, reply) {
  try {
    await req.jwtVerify();
    if (req.user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' });
  } catch { return reply.code(401).send({ error: 'Unauthorized' }); }
}

module.exports = { authenticate, adminOnly };
