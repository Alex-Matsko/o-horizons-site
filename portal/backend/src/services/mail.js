import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
});

export async function sendMail({ to, subject, html }) {
  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    html,
  });
}

export async function sendEmailVerification(email, token) {
  const url = `${config.appUrl}/verify-email?token=${token}`;
  await sendMail({
    to: email,
    subject: 'Подтвердите e-mail — O-Horizons Portal',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#01696f">Подтверждение e-mail</h2>
        <p>Для активации аккаунта перейдите по ссылке:</p>
        <a href="${url}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#01696f;color:#fff;text-decoration:none;border-radius:6px">Подтвердить e-mail</a>
        <p style="color:#999;font-size:12px">Ссылка действует 24 часа. Если вы не регистрировались — просто проигнорируйте это письмо.</p>
      </div>
    `,
  });
}

export async function sendPasswordReset(email, token) {
  const url = `${config.appUrl}/reset-password?token=${token}`;
  await sendMail({
    to: email,
    subject: 'Сброс пароля — O-Horizons Portal',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#01696f">Сброс пароля</h2>
        <p>Для сброса пароля перейдите по ссылке:</p>
        <a href="${url}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#01696f;color:#fff;text-decoration:none;border-radius:6px">Сбросить пароль</a>
        <p style="color:#999;font-size:12px">Ссылка действует 1 час. Если вы не запрашивали сброс — просто проигнорируйте это письмо.</p>
      </div>
    `,
  });
}

export async function sendDatabaseReady(email, dbName, url) {
  await sendMail({
    to: email,
    subject: `База «${dbName}» готова — O-Horizons Portal`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#01696f">Ваша база готова!</h2>
        <p>База <strong>${dbName}</strong> успешно создана и доступна по адресу:</p>
        <a href="${url}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#01696f;color:#fff;text-decoration:none;border-radius:6px">Открыть 1С</a>
      </div>
    `,
  });
}
