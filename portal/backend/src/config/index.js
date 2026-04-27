'use strict';

const config = {
  env:    process.env.NODE_ENV || 'development',
  port:   parseInt(process.env.PORT || '3001'),
  appUrl: process.env.APP_URL || 'http://localhost:3001',

  db: {
    host:     process.env.PORTAL_DB_HOST     || 'localhost',
    port:     parseInt(process.env.PORTAL_DB_PORT || '5432'),
    database: process.env.PORTAL_DB_NAME     || 'portal',
    user:     process.env.PORTAL_DB_USER     || 'portal_user',
    password: process.env.PORTAL_DB_PASSWORD,
  },

  redis: {
    host:     process.env.REDIS_HOST     || 'localhost',
    port:     parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },

  jwt: {
    secret:        process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl:     '15m',
    refreshTtl:    '30d',
  },

  smtp: {
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    user:   process.env.SMTP_USER,
    pass:   process.env.SMTP_PASS,
    from:   process.env.MAIL_FROM,
  },

  telegram: {
    token:       process.env.TELEGRAM_BOT_TOKEN,
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID,
  },

  onec: {
    serverHost:    process.env.ONEC_SERVER_HOST,
    sshUser:       process.env.ONEC_SERVER_SSH_USER    || 'portal_deploy',
    sshKeyPath:    process.env.ONEC_SERVER_SSH_KEY_PATH,
    clusterName:   process.env.ONEC_CLUSTER_NAME       || 'default',
    apacheBaseUrl: process.env.ONEC_APACHE_BASE_URL,
    apiUser:       process.env.ONEC_API_USER,
    apiPass:       process.env.ONEC_API_PASS,
    templatesPath: process.env.ONEC_TEMPLATES_PATH     || '/opt/1c/templates',
  },

  backups: {
    localPath:     process.env.BACKUP_LOCAL_PATH          || '/backups',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '14'),
  },

  admin: {
    email: process.env.ADMIN_EMAIL,
  },
};

module.exports = { config };
