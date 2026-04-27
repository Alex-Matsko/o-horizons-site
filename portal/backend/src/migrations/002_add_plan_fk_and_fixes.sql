-- Migration 002: add plan_id FK to tenants, fix missing indexes, add backup schedule fields
-- Run after 001_initial.sql

-- 1. Добавляем plan_id FK (tenants.plan был VARCHAR, нужна связь с таблицей plans)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id);

-- Заполняем plan_id из существующего VARCHAR поля plan
UPDATE tenants t
SET plan_id = p.id
FROM plans p
WHERE p.name = t.plan AND t.plan_id IS NULL;

-- 2. Индекс для быстрого поиска заявок на базы по статусу
CREATE INDEX IF NOT EXISTS idx_db_requests_tenant_status ON db_requests(tenant_id, status);

-- 3. Индекс для бэкапов по статусу (проверка running-бэкапов)
CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(database_id, status);

-- 4. Поле для планового расписания бэкапов
ALTER TABLE databases
  ADD COLUMN IF NOT EXISTS backup_schedule VARCHAR(50) DEFAULT NULL,  -- cron: '0 2 * * *'
  ADD COLUMN IF NOT EXISTS backup_retention_days INT DEFAULT 7;

-- 5. Поле file_name стало обязательным в схеме, добавляем дефолт для старых строк
UPDATE backups SET file_name = COALESCE(file_name, 'unknown') WHERE file_name IS NULL;
