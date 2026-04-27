import * as authService from './auth.service.js';

export async function register(req, reply) {
  try {
    const result = await authService.registerUser(req.body);
    reply.code(201).send(result);
  } catch (err) {
    reply.code(err.statusCode || 500).send({ error: err.message });
  }
}

export async function verifyEmail(req, reply) {
  try {
    const result = await authService.verifyEmail(req.body.token);
    reply.send(result);
  } catch (err) {
    reply.code(err.statusCode || 500).send({ error: err.message });
  }
}

export async function login(req, reply) {
  try {
    const result = await authService.loginUser(req.body, reply, req.server);
    reply.send(result);
  } catch (err) {
    reply.code(err.statusCode || 500).send({ error: err.message });
  }
}

export async function refresh(req, reply) {
  try {
    const token = req.cookies?.refresh_token;
    const result = await authService.refreshTokens(token, req.server);
    reply.send(result);
  } catch (err) {
    reply.code(err.statusCode || 401).send({ error: err.message });
  }
}

export async function logout(req, reply) {
  try {
    const token = req.cookies?.refresh_token;
    await authService.logoutUser(token);
    reply.clearCookie('refresh_token', { path: '/api/v1/auth' });
    reply.send({ message: 'Logged out' });
  } catch (err) {
    reply.code(500).send({ error: err.message });
  }
}

export async function forgotPassword(req, reply) {
  try {
    await authService.forgotPassword(req.body.email);
    reply.send({ message: 'If account exists, reset email sent' });
  } catch (err) {
    reply.code(500).send({ error: err.message });
  }
}

export async function resetPassword(req, reply) {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    reply.send({ message: 'Password reset successful' });
  } catch (err) {
    reply.code(err.statusCode || 500).send({ error: err.message });
  }
}
