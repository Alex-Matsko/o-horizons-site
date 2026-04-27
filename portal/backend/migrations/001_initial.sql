-- 001_initial.sql - Portal database schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tariff plans
CREATE TABLE IF NOT EXISTS tariffs (
  id           SERIAL PRIMARY KEY,
  code         VARCHAR(32) UNIQUE NOT NULL,
  name         VARCHAR(128) NOT NULL,
  max_bases    INT NOT NULL DEFAULT 1,
  max_users    INT NOT NULL DEFAULT 3,
  max_disk_gb  INT NOT NULL DEFAULT 10,
  price_rub    INT NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tariffs (code, name, max_bases, max_users, max_disk_gb, price_rub) VALUES
  ('starter',   'Стартер',      1,  5,  10,      0),
  ('business',  'Бизнес',       3, 15,  50,   4900),
  ('corporate', 'Корпоратив',  10, 50, 200,  14900),
  ('enterprise','Энтерпрайз',  30,200,1000,  49900)
ON CONFLICT (code) DO NOTHING;

-- Tenants (clients)
CREATE TABLE IF NOT EXISTS tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(256) UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  org_name        VARCHAR(256),
  phone           VARCHAR(32),
  email_verified  BOOLEAN NOT NULL DEFAULT false,
  verify_token    TEXT,
  verify_expires  TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  role            VARCHAR(16) NOT NULL DEFAULT 'client',
  tariff_id       INT REFERENCES tariffs(id) DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_tenant ON refresh_tokens(tenant_id);

-- 1C configs catalog
CREATE TABLE IF NOT EXISTS onec_configs (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(64) UNIQUE NOT NULL,
  name        VARCHAR(128) NOT NULL,
  cf_filename VARCHAR(256) NOT NULL,
  platform    VARCHAR(16) NOT NULL DEFAULT '8.3',
  is_active   BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO onec_configs (code, name, cf_filename, platform) VALUES
  ('bp_3_0',     '1С:Бухгалтерия 3.0',         'bp_3_0.cf',     '8.3'),
  ('ut_11',      '1С:Управление торговлей 11',  'ut_11.cf',      '8.3'),
  ('unf_1_6',    '1С:УНФ 1.6',                 'unf_1_6.cf',    '8.3'),
  ('retail_2_3', '1С:Розница 2.3',              'retail_2_3.cf', '8.3')
ON CONFLICT (code) DO NOTHING;

-- Client databases
CREATE TABLE IF NOT EXISTS databases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  config_id       INT NOT NULL REFERENCES onec_configs(id),
  name            VARCHAR(128) NOT NULL,
  db_name         VARCHAR(128) UNIQUE,
  onec_ib_name    VARCHAR(128) UNIQUE,
  url             TEXT,
  status          VARCHAR(32) NOT NULL DEFAULT 'pending_approval',
  error_message   TEXT,
  disk_used_mb    INT DEFAULT 0,
  last_health_at  TIMESTAMPTZ,
  is_healthy      BOOLEAN,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_databases_tenant ON databases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_databases_status ON databases(status);

-- Provision requests
CREATE TABLE IF NOT EXISTS provision_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  database_id   UUID REFERENCES databases(id),
  config_id     INT NOT NULL REFERENCES onec_configs(id),
  db_alias      VARCHAR(128) NOT NULL,
  status        VARCHAR(32) NOT NULL DEFAULT 'pending',
  admin_note    TEXT,
  approved_by   UUID REFERENCES tenants(id),
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_provision_requests_status ON provision_requests(status);

-- Provision steps log
CREATE TABLE IF NOT EXISTS provision_steps (
  id          SERIAL PRIMARY KEY,
  request_id  UUID NOT NULL REFERENCES provision_requests(id) ON DELETE CASCADE,
  step        INT NOT NULL,
  name        VARCHAR(128) NOT NULL,
  status      VARCHAR(16) NOT NULL DEFAULT 'pending',
  message     TEXT,
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  UNIQUE(request_id, step)
);

-- 1C users cache
CREATE TABLE IF NOT EXISTS db_users_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  onec_uuid   VARCHAR(64),
  name        VARCHAR(256) NOT NULL,
  login       VARCHAR(128) NOT NULL,
  roles       TEXT[],
  is_active   BOOLEAN DEFAULT true,
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (database_id, login)
);
CREATE INDEX IF NOT EXISTS idx_db_users_database ON db_users_cache(database_id);

-- Backups
CREATE TABLE IF NOT EXISTS backups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  type        VARCHAR(16) NOT NULL DEFAULT 'auto',
  status      VARCHAR(16) NOT NULL DEFAULT 'pending',
  file_path   TEXT,
  file_size   BIGINT,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_backups_database ON backups(database_id);
CREATE INDEX IF NOT EXISTS idx_backups_tenant ON backups(tenant_id);

-- Healthcheck history
CREATE TABLE IF NOT EXISTS healthcheck_history (
  id          BIGSERIAL PRIMARY KEY,
  database_id UUID NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  is_up       BOOLEAN NOT NULL,
  latency_ms  INT,
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_health_database_time ON healthcheck_history(database_id, checked_at DESC);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   UUID REFERENCES tenants(id),
  action      VARCHAR(128) NOT NULL,
  entity_type VARCHAR(64),
  entity_id   TEXT,
  meta        JSONB,
  ip          VARCHAR(64),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;
CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_databases_updated_at ON databases;
CREATE TRIGGER trg_databases_updated_at BEFORE UPDATE ON databases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_provision_requests_updated_at ON provision_requests;
CREATE TRIGGER trg_provision_requests_updated_at BEFORE UPDATE ON provision_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
