export async function authenticate(request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

export async function requireAdmin(request, reply) {
  await authenticate(request, reply);
  if (request.user?.role !== 'admin') {
    reply.code(403).send({ error: 'Forbidden' });
  }
}

export async function requireVerified(request, reply) {
  try {
    await request.jwtVerify();
    if (!request.user?.emailVerified) {
      reply.code(403).send({ error: 'Email not verified' });
    }
  } catch {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}
