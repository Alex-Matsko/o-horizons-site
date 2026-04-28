// ESM — все импорты в проекте используют import/export
export const config = {
  env:    process.env.NODE_ENV || 'development',
  port:   parseInt(process.env.PORTAL_PORT || '3001'),
  appUrl: process.env.PORTAL_URL || 'http://localhost:3001',

  db: {
    host:     process.env.PORTAL_DB_HOST     || 'localhost',
    port:     parseInt(process.env.PORTAL_DB_PORT || '5432'),
    database: process.env.PORTAL_DB_NAME     || 'portal',
    user:     process.env.PORTAL_DB_USER     || 'portal_user',
    // .env: PORTAL_DB_PASS
    password: process.env.PORTAL_DB_PASS,
  },

  redis: {
    host:     process.env.REDIS_HOST     || 'localhost',
    port:     parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },

  jwt: {
    secret:        process.env.JWT_SECRET,
    // .env: JWT_REFRESH_SECRET (добавить если не задан)
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    accessTtl:     process.env.JWT_EXPIRES_IN || '7d',
    refreshTtl:    '30d',
  },

  smtp: {
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    user:   process.env.SMTP_USER,
    pass:   process.env.SMTP_PASS,
    from:   process.env.EMAIL_FROM,
  },

  telegram: {
    token:       process.env.TELEGRAM_BOT_TOKEN,
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID,
  },

  onec: {
    serverHost:    process.env.ONEC_SERVER_HOST,
    // .env: SSH_1C_USER → переименован в ONEC_SERVER_SSH_USER
    sshUser:       process.env.ONEC_SERVER_SSH_USER    || process.env.SSH_1C_USER || 'portaldeploy',
    // .env: SSH_KEY_PATH → переименован в ONEC_SERVER_SSH_KEY_PATH
    sshKeyPath:    process.env.ONEC_SERVER_SSH_KEY_PATH || process.env.SSH_KEY_PATH,
    clusterName:   process.env.ONEC_CLUSTER_ID,
    apacheBaseUrl: process.env.ONEC_APACHE_BASE_URL,
    apiUser:       process.env.ONEC_API_USER,
    apiPass:       process.env.ONEC_API_PASS,
    templatesPath: process.env.ONEC_TEMPLATES_PATH     || '/opt/1c/templates',
    scriptPath:    process.env.ONEC_SCRIPT_PATH        || '/app/scripts/create-1c-db.sh',
    serverUrl:     process.env.ONEC_SERVER_URL,
  },

  backups: {
    localPath:     process.env.BACKUP_DIR              || '/backups',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '7'),
  },

  admin: {
    email: process.env.ADMIN_EMAIL,
  },
};
