export async function authenticate(request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

export async function requireAdmin(request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  if (request.user?.role !== 'admin') {
    return reply.code(403).send({ error: 'Forbidden' });
  }
}

export async function requireVerified(request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  if (!request.user?.emailVerified) {
    return reply.code(403).send({ error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' });
  }
}
