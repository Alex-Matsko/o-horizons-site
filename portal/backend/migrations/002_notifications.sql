-- 002_notifications.sql
-- Таблица уведомлений для портала (profile.js, admin)

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type        VARCHAR(64) NOT NULL DEFAULT 'info',
              -- 'db_ready' | 'backup_done' | 'db_error' | 'limit_warning' | 'info'
  title       VARCHAR(256) NOT NULL,
  body        TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  meta        JSONB,         -- доп-данные: database_id, backup_id и т.д.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_unread
  ON notifications(tenant_id, is_read, created_at DESC);

-- Автоматическая очистка: удаляем уведомления старше 90 дней
CREATE INDEX IF NOT EXISTS idx_notifications_created
  ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS
  'Уведомления пользователей портала. Удалять записи старше 90 дней через pg_cron или cron-задачу.';
