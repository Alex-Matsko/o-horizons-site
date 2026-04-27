-- ============================================================
-- Portal Schema v1.0
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tenants (companies/clients)
CREATE TABLE IF NOT EXISTS tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name  VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,
  plan          VARCHAR(50) NOT NULL DEFAULT 'starter',
  status        VARCHAR(50) NOT NULL DEFAULT 'active',  -- active | suspended | deleted
  max_databases INT NOT NULL DEFAULT 1,
  max_users_per_db INT NOT NULL DEFAULT 5,
  max_storage_gb   INT NOT NULL DEFAULT 5,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  full_name       VARCHAR(255),
  role            VARCHAR(50) NOT NULL DEFAULT 'client',  -- admin | client | support
  email_verified  BOOLEAN NOT NULL DEFAULT false,
  status          VARCHAR(50) NOT NULL DEFAULT 'active',  -- active | suspended
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenant_id);

-- Email verification & password reset tokens
CREATE TABLE IF NOT EXISTS tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,  -- email_verify | password_reset | refresh
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tokens_hash ON tokens(token_hash);

-- Plans
CREATE TABLE IF NOT EXISTS plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100) UNIQUE NOT NULL,  -- starter | business | corporate | enterprise
  display_name      VARCHAR(255) NOT NULL,
  price_per_user    NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_per_db      NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_databases     INT NOT NULL DEFAULT 1,
  max_users_per_db  INT NOT NULL DEFAULT 5,
  max_storage_gb    INT NOT NULL DEFAULT 5,
  features          JSONB NOT NULL DEFAULT '[]',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1C Databases
CREATE TABLE IF NOT EXISTS databases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  infobase_name   VARCHAR(255) UNIQUE NOT NULL,  -- system name on 1C server
  configuration   VARCHAR(100) NOT NULL,           -- bp | ut | retail | unf | ...
  version_1c      VARCHAR(20),                     -- 8.3.27 | 8.5.1
  status          VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending | creating | active | suspended | deleting | error
  apache_url      TEXT,                            -- published URL
  server_host     VARCHAR(255),
  size_mb         BIGINT,
  last_healthcheck_at TIMESTAMPTZ,
  healthcheck_ok  BOOLEAN,
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_databases_tenant ON databases(tenant_id);
CREATE INDEX idx_databases_status ON databases(status);

-- 1C Database users (managed via REST API 1C)
CREATE TABLE IF NOT EXISTS db_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id   UUID NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  onec_user_name VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255),
  roles         JSONB NOT NULL DEFAULT '[]',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(database_id, onec_user_name)
);

-- Database requests (from portal user -> admin approval)
CREATE TABLE IF NOT EXISTS db_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES users(id),
  configuration   VARCHAR(100) NOT NULL,
  desired_name    VARCHAR(255),
  version_1c      VARCHAR(20),
  comment         TEXT,
  status          VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | completed
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  review_comment  TEXT,
  database_id     UUID REFERENCES databases(id),  -- filled after completion
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backups
CREATE TABLE IF NOT EXISTS backups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id   UUID NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  file_path     TEXT NOT NULL,
  file_name     VARCHAR(500) NOT NULL,
  size_bytes    BIGINT,
  type          VARCHAR(50) NOT NULL DEFAULT 'manual',  -- manual | scheduled
  status        VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending | running | done | error
  error_message TEXT,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_backups_database ON backups(database_id);

-- Jobs / task queue log
CREATE TABLE IF NOT EXISTS job_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type    VARCHAR(100) NOT NULL,
  payload     JSONB,
  status      VARCHAR(50) NOT NULL DEFAULT 'running',  -- running | done | error
  result      JSONB,
  error       TEXT,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  related_id  UUID  -- database_id / backup_id / etc.
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id   UUID,
  details     JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_action ON audit_log(action);

-- Healthcheck history
CREATE TABLE IF NOT EXISTS healthcheck_history (
  id          BIGSERIAL PRIMARY KEY,
  database_id UUID NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  is_ok       BOOLEAN NOT NULL,
  latency_ms  INT,
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_healthcheck_db ON healthcheck_history(database_id, checked_at DESC);

-- Default plans seed
INSERT INTO plans (name, display_name, price_per_user, price_per_db, max_databases, max_users_per_db, max_storage_gb, features, sort_order)
VALUES
  ('starter',    'Стартер',     0,     0,    1,  5,  5,  '["1 база", "до 5 пользователей", "5 ГБ", "E-mail поддержка"]', 1),
  ('business',   'Бизнес',      0,     0,    3,  20, 20, '["3 базы", "до 20 пользователей", "20 ГБ", "Приоритетная поддержка", "Планировщик бэкапов"]', 2),
  ('corporate',  'Корпоратив',  0,     0,    10, 50, 50, '["10 баз", "до 50 пользователей", "50 ГБ", "Dedicated ресурсы", "SLA 99.9%"]', 3),
  ('enterprise', 'Энтерпрайз',  0,     0,    -1, -1, -1, '["Без ограничений", "Персональный менеджер", "Custom SLA", "On-premise вариант"]', 4)
ON CONFLICT (name) DO NOTHING;
