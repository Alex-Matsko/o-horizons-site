import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
});

export async function sendMail({ to, subject, html }) {
  return transporter.sendMail({ from: config.smtp.from, to, subject, html });
}

export async function sendVerificationEmail(email, token) {
  const url = `${config.appUrl}/api/auth/verify/${token}`;
  return sendMail({
    to: email,
    subject: 'Подтверждение email — O-Horizons 1С Портал',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Добро пожаловать в O-Horizons 1С Портал</h2>
        <p>Для подтверждения email перейдите по ссылке:</p>
        <a href="${url}" style="display:inline-block;background:#01696f;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Подтвердить email</a>
        <p style="margin-top:16px;color:#666">Ссылка действительна 24 часа.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email, token) {
  const url = `${config.appUrl}/reset-password?token=${token}`;
  return sendMail({
    to: email,
    subject: 'Сброс пароля — O-Horizons 1С Портал',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Сброс пароля</h2>
        <p>Для сброса пароля перейдите по ссылке:</p>
        <a href="${url}" style="display:inline-block;background:#01696f;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Сбросить пароль</a>
        <p style="margin-top:16px;color:#666">Ссылка действительна 1 час.</p>
      </div>
    `,
  });
}
