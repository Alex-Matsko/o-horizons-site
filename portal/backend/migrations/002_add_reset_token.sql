-- 002_add_reset_token.sql
-- Adds password-reset columns to tenants (missing from 001_initial.sql)

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS reset_token   TEXT,
  ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tenants_reset_token ON tenants(reset_token)
  WHERE reset_token IS NOT NULL;
