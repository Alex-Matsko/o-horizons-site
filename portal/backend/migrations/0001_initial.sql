-- O-Horizons 1C Portal: Initial Schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- TARIFFS
CREATE TABLE IF NOT EXISTS tariffs (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(64) NOT NULL,
  price_month INTEGER NOT NULL DEFAULT 0,
  max_databases INTEGER NOT NULL DEFAULT 1,
  max_users INTEGER NOT NULL DEFAULT 3,
  max_storage_gb INTEGER NOT NULL DEFAULT 15,
  backup_retention_days INTEGER NOT NULL DEFAULT 7,
  monitoring BOOLEAN NOT NULL DEFAULT FALSE,
  sla BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tariffs (slug,name,price_month,max_databases,max_users,max_storage_gb,backup_retention_days,monitoring,sla) VALUES
  ('starter',  'Starter',   3500,  1,  3,  15, 7,  FALSE, FALSE),
  ('business', 'Business',  8900,  5,  10, 50, 30, TRUE,  FALSE),
  ('corporate','Corporate', 18500, 20, 50, 200,90, TRUE,  TRUE)
ON CONFLICT (slug) DO NOTHING;

-- TENANTS (клиенты)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(128),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'client',
  tariff_id INTEGER REFERENCES tariffs(id) DEFAULT 1,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verify_token VARCHAR(128),
  verify_token_expires TIMESTAMPTZ,
  reset_token VARCHAR(128),
  reset_token_expires TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  telegram VARCHAR(64),
  phone VARCHAR(32),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);

-- Insert default admin
INSERT INTO tenants (company_name, email, password_hash, role, email_verified)
VALUES ('O-Horizons', 'admin@o-horizons.com', '$REPLACE_WITH_BCRYPT_HASH', 'admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- 1C DATABASES
CREATE TABLE IF NOT EXISTS databases_1c (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  db_name VARCHAR(64) UNIQUE NOT NULL,
  configuration VARCHAR(64) NOT NULL,
  platform_version VARCHAR(16) NOT NULL DEFAULT '8.3.27',
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  url_path VARCHAR(128),
  pg_database VARCHAR(64),
  size_mb INTEGER DEFAULT 0,
  user_count INTEGER DEFAULT 0,
  comment TEXT,
  last_health_check TIMESTAMPTZ,
  health_status VARCHAR(16) DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_db1c_tenant ON databases_1c(tenant_id);
CREATE INDEX IF NOT EXISTS idx_db1c_status ON databases_1c(status);

-- DB REQUESTS (заявки на создание)
CREATE TABLE IF NOT EXISTS db_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  db_name_requested VARCHAR(128) NOT NULL,
  configuration VARCHAR(64) NOT NULL,
  platform_version VARCHAR(16) NOT NULL DEFAULT '8.3.27',
  comment TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  database_id UUID REFERENCES databases_1c(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BACKUPS
CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES databases_1c(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(16) NOT NULL DEFAULT 'auto',
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  size_mb INTEGER,
  file_path VARCHAR(512),
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_backups_db ON backups(database_id);
CREATE INDEX IF NOT EXISTS idx_backups_tenant ON backups(tenant_id);

-- USERS 1C (пользователи внутри баз)
CREATE TABLE IF NOT EXISTS users_1c (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES databases_1c(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  username VARCHAR(128) NOT NULL,
  full_name VARCHAR(256),
  roles TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users1c_unique ON users_1c(database_id, username);

-- HEALTH CHECKS
CREATE TABLE IF NOT EXISTS health_checks (
  id BIGSERIAL PRIMARY KEY,
  database_id UUID NOT NULL REFERENCES databases_1c(id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL,
  response_ms INTEGER,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_health_db ON health_checks(database_id, checked_at DESC);

-- AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  action VARCHAR(128) NOT NULL,
  entity VARCHAR(64),
  entity_id VARCHAR(128),
  meta JSONB,
  ip VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(256) NOT NULL,
  body TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_tenant ON notifications(tenant_id, is_read);
