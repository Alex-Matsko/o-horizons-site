-- 0001_initial.sql
-- Инициальная схема базы данных 1С портала

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  max_databases INTEGER NOT NULL DEFAULT 1,
  max_users_per_db INTEGER NOT NULL DEFAULT 3,
  max_storage_gb INTEGER NOT NULL DEFAULT 5,
  price NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verify_token VARCHAR(255),
  reset_password_token VARCHAR(255),
  reset_password_expires TIMESTAMPTZ,
  full_name VARCHAR(255),
  company_name VARCHAR(255),
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  is_admin BOOLEAN DEFAULT FALSE,
  plan_id UUID REFERENCES plans(id),
  refresh_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  configuration VARCHAR(100) NOT NULL,
  version_1c VARCHAR(20) NOT NULL DEFAULT '8.3.27',
  status VARCHAR(50) DEFAULT 'pending',
  web_url TEXT,
  apache_config_path TEXT,
  db_name VARCHAR(100),
  db_host VARCHAR(255) DEFAULT 'localhost',
  db_port INTEGER DEFAULT 5432,
  db_user VARCHAR(100),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS database_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  database_id UUID REFERENCES databases(id),
  configuration VARCHAR(100) NOT NULL,
  desired_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  admin_comment TEXT,
  approved_by UUID REFERENCES tenants(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS db_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(database_id, username)
);

CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  type VARCHAR(20) DEFAULT 'manual',
  status VARCHAR(30) DEFAULT 'pending',
  file_path TEXT,
  file_size_bytes BIGINT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS healthcheck_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  response_time_ms INTEGER,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_body TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_databases_tenant_id ON databases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_databases_status ON databases(status);
CREATE INDEX IF NOT EXISTS idx_backups_database_id ON backups(database_id);
CREATE INDEX IF NOT EXISTS idx_healthcheck_database_id ON healthcheck_history(database_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_id ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);

-- Базовые тарифные планы
INSERT INTO plans (name, max_databases, max_users_per_db, max_storage_gb, price)
VALUES
  ('Starter',   1,  3,   5,  0),
  ('Business',  3,  10,  20, 0),
  ('Corporate', 10, 50,  100, 0),
  ('Enterprise', 999, 999, 999, 0)
ON CONFLICT DO NOTHING;
