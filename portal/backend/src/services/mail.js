import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
});

export async function sendVerificationEmail(to, token) {
  const url = `${config.appUrl}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject: 'Подтвердите email — O-Horizons 1C Portal',
    html: `
      <div style="font-family:Inter,sans-serif;background:#0d0f14;color:#e2e8f0;padding:40px;border-radius:12px;max-width:480px;margin:auto;">
        <h2 style="color:#3b82f6;margin-bottom:16px;">Добро пожаловать в 1C Portal</h2>
        <p style="color:#94a3b8;margin-bottom:24px;">Для завершения регистрации подтвердите ваш email:</p>
        <a href="${url}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Подтвердить email</a>
        <p style="color:#475569;font-size:12px;margin-top:24px;">Ссылка действительна 24 часа.</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(to, orgName) {
  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject: 'Аккаунт активирован — O-Horizons 1C Portal',
    html: `
      <div style="font-family:Inter,sans-serif;background:#0d0f14;color:#e2e8f0;padding:40px;border-radius:12px;max-width:480px;margin:auto;">
        <h2 style="color:#22c55e;margin-bottom:16px;">Аккаунт подтверждён!</h2>
        <p style="color:#94a3b8;">Организация <strong style="color:#e2e8f0;">${orgName || to}</strong> успешно зарегистрирована.</p>
        <p style="color:#94a3b8;margin:16px 0;">Теперь вы можете войти в личный кабинет и заказать первую базу 1С.</p>
        <a href="${config.appUrl}/login" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Войти в портал</a>
      </div>
    `,
  });
}

export async function sendDatabaseReadyEmail(to, dbName, url) {
  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject: `База "${dbName}" готова — O-Horizons 1C Portal`,
    html: `
      <div style="font-family:Inter,sans-serif;background:#0d0f14;color:#e2e8f0;padding:40px;border-radius:12px;max-width:480px;margin:auto;">
        <h2 style="color:#22c55e;margin-bottom:16px;">База данных готова!</h2>
        <p style="color:#94a3b8;">Ваша база <strong style="color:#e2e8f0;">${dbName}</strong> успешно создана и опубликована.</p>
        <p style="color:#94a3b8;margin:16px 0;">Ссылка для подключения:</p>
        <a href="${url}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Открыть в 1С Web-клиент</a>
        <p style="color:#475569;font-size:12px;margin-top:24px;">Управление пользователями доступно в личном кабинете.</p>
      </div>
    `,
  });
}
