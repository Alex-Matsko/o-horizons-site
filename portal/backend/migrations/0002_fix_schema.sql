-- Migration 0002: fix schema mismatches from 0001
-- Safe to run multiple times (idempotent)

-- 1. tariffs: add slug column if missing
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS slug VARCHAR(32);
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS backup_retention_days INTEGER NOT NULL DEFAULT 7;
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS monitoring BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS sla BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- populate slug from name if empty
UPDATE tariffs SET slug = LOWER(REPLACE(name, ' ', '_')) WHERE slug IS NULL;

-- add unique constraint if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tariffs_slug_key'
  ) THEN
    ALTER TABLE tariffs ADD CONSTRAINT tariffs_slug_key UNIQUE (slug);
  END IF;
END $$;

-- upsert tariffs data
INSERT INTO tariffs (slug,name,price_month,max_databases,max_users,max_storage_gb,backup_retention_days,monitoring,sla) VALUES
  ('starter',   'Starter',   3500,  1,  3,  15,  7,  FALSE, FALSE),
  ('business',  'Business',  8900,  5,  10, 50,  30, TRUE,  FALSE),
  ('corporate', 'Corporate', 18500, 20, 50, 200, 90, TRUE,  TRUE)
ON CONFLICT (slug) DO UPDATE SET
  price_month = EXCLUDED.price_month,
  max_databases = EXCLUDED.max_databases,
  max_users = EXCLUDED.max_users,
  max_storage_gb = EXCLUDED.max_storage_gb;

-- 2. tenants: add missing columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug VARCHAR(64);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_databases INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_users INTEGER NOT NULL DEFAULT 5;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_storage_gb INTEGER NOT NULL DEFAULT 15;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_name VARCHAR(128);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS verify_token VARCHAR(128);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS verify_token_expires TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reset_token VARCHAR(128);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS telegram VARCHAR(64);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone VARCHAR(32);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notes TEXT;

-- populate slug for existing rows
UPDATE tenants SET slug = LOWER(REPLACE(COALESCE(company_name, email), ' ', '-'))
WHERE slug IS NULL;

-- 3. backups: add tenant_id if missing
ALTER TABLE backups ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- backfill tenant_id from databases_1c
UPDATE backups b
SET tenant_id = d.tenant_id
FROM databases_1c d
WHERE b.database_id = d.id AND b.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_backups_tenant ON backups(tenant_id);

-- 4. Reset admin password to 'admin' (bcrypt hash)
-- IMPORTANT: change via profile after first login!
UPDATE tenants
SET password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uDutXXAK'
WHERE email = 'admin@o-horizons.com';

-- If admin doesn't exist yet — insert
INSERT INTO tenants (company_name, email, password_hash, role, email_verified)
VALUES ('O-Horizons', 'admin@o-horizons.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uDutXXAK', 'admin', TRUE)
ON CONFLICT (email) DO NOTHING;
