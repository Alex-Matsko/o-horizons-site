-- Portal Database Schema v1.0

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tariffs
CREATE TABLE IF NOT EXISTS tariffs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(100) NOT NULL,
  max_databases        INTEGER NOT NULL DEFAULT 1,
  max_users_per_db     INTEGER NOT NULL DEFAULT 3,
  max_db_size_gb       INTEGER NOT NULL DEFAULT 5,
  backup_retention_days INTEGER NOT NULL DEFAULT 7,
  backup_manual_count  INTEGER NOT NULL DEFAULT 2,
  support_level        VARCHAR(20) DEFAULT 'email',
  price_monthly        DECIMAL(10,2) DEFAULT 0,
  is_active            BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default tariffs
INSERT INTO tariffs (name,max_databases,max_users_per_db,max_db_size_gb,backup_retention_days,backup_manual_count) VALUES
  ('Starter',   1,  3,  5,   7,  2),
  ('Business',  5,  15, 20,  30, 5),
  ('Corporate', 20, 50, 100, 90, 10),
  ('Enterprise', 999, 999, 999, 365, 20)
ON CONFLICT DO NOTHING;

-- Tenants (organizations)
CREATE TABLE IF NOT EXISTS tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  inn        VARCHAR(12),
  email      VARCHAR(255) NOT NULL UNIQUE,
  phone      VARCHAR(20),
  status     VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  tariff_id  UUID REFERENCES tariffs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portal users
CREATE TABLE IF NOT EXISTS portal_users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email              VARCHAR(255) NOT NULL UNIQUE,
  password_hash      VARCHAR(255) NOT NULL,
  full_name          VARCHAR(255),
  role               VARCHAR(20) NOT NULL DEFAULT 'CLIENT',
  email_verified     BOOLEAN DEFAULT FALSE,
  email_verified_at  TIMESTAMPTZ,
  status             VARCHAR(20) DEFAULT 'PENDING_EMAIL',
  last_login_at      TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Email tokens
CREATE TABLE IF NOT EXISTS email_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES portal_users(id) ON DELETE CASCADE,
  token      VARCHAR(255) NOT NULL UNIQUE,
  type       VARCHAR(30) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES portal_users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
  user_agent         TEXT,
  ip_address         INET,
  expires_at         TIMESTAMPTZ NOT NULL,
  revoked_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 1C configurations (available templates)
CREATE TABLE IF NOT EXISTS configurations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100) NOT NULL,
  short_name        VARCHAR(50),
  version           VARCHAR(20),
  template_path     TEXT NOT NULL DEFAULT '',
  platform_versions TEXT[] DEFAULT ARRAY['8.3.27', '8.5.1'],
  is_active         BOOLEAN DEFAULT TRUE
);

-- Seed configurations
INSERT INTO configurations (name, short_name, version, template_path, platform_versions) VALUES
  ('Бухгалтерия предприятия', 'БП',     '3.0', '/opt/1c/templates/bp.cf',     ARRAY['8.3.27','8.5.1']),
  ('Управление торговлей',    'УТ',     '11',  '/opt/1c/templates/ut.cf',     ARRAY['8.3.27','8.5.1']),
  ('Управление нашей фирмой','УНФ',    '3.0', '/opt/1c/templates/unf.cf',    ARRAY['8.3.27','8.5.1']),
  ('Розница',                 'Розница','3.0', '/opt/1c/templates/retail.cf', ARRAY['8.3.27','8.5.1'])
ON CONFLICT DO NOTHING;

-- Databases (1C info bases)
CREATE TABLE IF NOT EXISTS databases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id) ON DELETE RESTRICT,
  name                VARCHAR(100) NOT NULL UNIQUE,
  display_name        VARCHAR(255),
  config_id           UUID REFERENCES configurations(id),
  platform_version    VARCHAR(20),
  status              VARCHAR(20) DEFAULT 'PENDING',
  error_message       TEXT,
  pg_database_name    VARCHAR(100),
  public_url          TEXT,
  size_gb             DECIMAL(8,2),
  last_size_check_at  TIMESTAMPTZ,
  last_activity_at    TIMESTAMPTZ,
  last_healthcheck_at TIMESTAMPTZ,
  healthcheck_status  VARCHAR(10),
  tenant_comment      TEXT,
  admin_comment       TEXT,
  requested_at        TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ,
  created_by          UUID REFERENCES portal_users(id)
);

-- 1C users cache
CREATE TABLE IF NOT EXISTS db_users_cache (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id    UUID REFERENCES databases(id) ON DELETE CASCADE,
  onec_user_id   VARCHAR(255),
  login          VARCHAR(255) NOT NULL,
  full_name      VARCHAR(255),
  roles          JSONB DEFAULT '[]',
  is_active      BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(database_id, login)
);

-- Backups
CREATE TABLE IF NOT EXISTS backups (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id      UUID REFERENCES databases(id) ON DELETE CASCADE,
  type             VARCHAR(10) NOT NULL,
  status           VARCHAR(20) DEFAULT 'CREATING',
  file_path        TEXT,
  file_size_bytes  BIGINT,
  storage_type     VARCHAR(20) DEFAULT 'local',
  error_message    TEXT,
  created_by       UUID REFERENCES portal_users(id),
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

-- Healthcheck history
CREATE TABLE IF NOT EXISTS healthcheck_history (
  id              BIGSERIAL PRIMARY KEY,
  database_id     UUID REFERENCES databases(id) ON DELETE CASCADE,
  status          VARCHAR(10) NOT NULL,
  response_time_ms INTEGER,
  checked_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID REFERENCES portal_users(id),
  actor_email   VARCHAR(255),
  action        VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id   UUID,
  details       JSONB,
  ip_address    INET,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES portal_users(id) ON DELETE CASCADE,
  type       VARCHAR(50),
  title      VARCHAR(255),
  body       TEXT,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_databases_tenant    ON databases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_databases_status    ON databases(status);
CREATE INDEX IF NOT EXISTS idx_backups_database    ON backups(database_id);
CREATE INDEX IF NOT EXISTS idx_hc_history_database ON healthcheck_history(database_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user       ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_token  ON email_tokens(token);
