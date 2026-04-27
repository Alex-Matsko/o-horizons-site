# Техническое задание: SaaS-портал для 1С
## 1c.o-horizons.com

**Версия:** 1.0  
**Дата:** Апрель 2026  
**Проект:** O-Horizons 1C Portal  

---

## 1. Цель проекта

Разработка полноценного SaaS-портала для предоставления клиентам O-Horizons доступа к базам 1С:Предприятие в режиме облачного сервиса (аналог 1С:Фреш). Портал размещается на домене `1c.o-horizons.com`.

---

## 2. Инфраструктура

### Сервер 1С
- **Версии:** 1С:Предприятие 8.3.27 и 8.5.1
- **Режим:** Клиент-серверный, 1 нода
- **СУБД:** PostgreSQL
- **Публикация баз:** Apache HTTP Server
- **Конфигурации:** БП, УТ, Розница, УНФ и другие типовые
- **Количество баз:** 10–100

### Портал
- **Домен:** `1c.o-horizons.com`
- **Backend:** Node.js (Fastify)
- **Frontend:** React 18 + Vite
- **БД портала:** PostgreSQL (отдельный инстанс от 1С)
- **Очередь задач:** BullMQ + Redis
- **ORM:** Drizzle ORM
- **Контейнеризация:** Docker + docker-compose
- **Прокси:** Nginx

---

## 3. Функциональные требования

### 3.1 Регистрация и аутентификация
- Регистрация по email + пароль
- Подтверждение email (ссылка на почту)
- Вход по JWT (access + refresh токены)
- Восстановление пароля по email
- Без SSO на данном этапе

### 3.2 Личный кабинет клиента
- Список доступных баз 1С с их статусами
- Прямые ссылки для входа в каждую базу (web-клиент 1С)
- Информация о тарифе: лимит баз, лимит пользователей на базу
- Кнопка «Заказать новую базу» (создаёт заявку, требует ручного подтверждения администратором)
- Управление пользователями каждой базы (добавить/удалить/изменить роль через REST API 1С)
- Статус базы: активна / создаётся / на обслуживании / заблокирована
- История операций (аудит лог)

### 3.3 Заказ новой базы
1. Клиент выбирает конфигурацию (БП, УТ, Розница, УНФ)
2. Клиент указывает название базы
3. Создаётся заявка со статусом `pending`
4. Администратор получает уведомление на email
5. Администратор подтверждает заявку в панели
6. Система автоматически запускает pipeline создания базы
7. Клиент получает уведомление о готовности

### 3.4 Pipeline создания базы
1. Генерация уникального идентификатора базы (slug)
2. Создание базы через `ibcmd` CLI на сервере 1С
3. Загрузка шаблона конфигурации из CF-файла
4. Публикация базы через Apache (обновление конфига + reload)
5. Создание первого пользователя-администратора базы через REST API 1С
6. Запись в БД портала, смена статуса на `active`
7. Отправка email клиенту с ссылкой и данными

Каждый шаг логируется. При ошибке — rollback и уведомление администратора.

### 3.5 Управление пользователями 1С
- Через REST API 1С (OData)
- Добавить пользователя в базу
- Удалить пользователя
- Изменить роль пользователя
- Список пользователей базы
- Проверка лимита пользователей по тарифу

### 3.6 Управление резервными копиями
- Автоматическое резервное копирование по расписанию (cron)
- Ручное создание бэкапа из личного кабинета
- Список бэкапов с датой, размером, статусом
- Скачивание бэкапа
- Восстановление из бэкапа (требует подтверждения)
- Хранение бэкапов: локально + опционально S3
- Период хранения: 30 дней

### 3.7 Мониторинг баз
- Healthcheck каждые 5 минут (ping HTTP веб-клиента базы)
- Статус доступности в реальном времени
- История доступности (uptime за 30 дней)
- Уведомление администратора при недоступности базы >5 минут

### 3.8 Тарификация

| Тариф | Баз | Польз./база | Хранилище | Цена |
|-------|-----|-------------|-----------|------|
| Starter | 1 | 3 | 5 GB | Бесплатно / по договору |
| Business | 3 | 10 | 20 GB | по договору |
| Corporate | 10 | 50 | 100 GB | по договору |
| Enterprise | Не ограничено | Не ограничено | Не ограничено | по договору |

- Тариф назначается администратором вручную
- При превышении лимита — запрет с уведомлением
- История изменений тарифа

### 3.9 Панель администратора
- Список всех клиентов (tenants)
- Список всех баз с фильтрацией по клиенту, статусу, конфигурации
- Управление заявками на создание баз (подтвердить/отклонить)
- Назначение тарифов
- Просмотр логов операций
- Ручной запуск бэкапа любой базы
- Блокировка/разблокировка клиента или базы
- Мониторинг healthcheck всех баз

---

## 4. Схема базы данных

```sql
-- Тенанты (клиенты)
CREATE TABLE tenants (
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
  refresh_token VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Тарифные планы
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  max_databases INTEGER NOT NULL,
  max_users_per_db INTEGER NOT NULL,
  max_storage_gb INTEGER NOT NULL,
  price NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Базы 1С
CREATE TABLE databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  configuration VARCHAR(100) NOT NULL, -- BP, UT, Roznica, UNF
  version_1c VARCHAR(20) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending|creating|active|error|blocked|maintenance
  web_url TEXT,
  apache_config_path TEXT,
  db_name VARCHAR(100),
  db_host VARCHAR(255),
  db_port INTEGER DEFAULT 5432,
  db_user VARCHAR(100),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Заявки на создание базы
CREATE TABLE database_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  database_id UUID REFERENCES databases(id),
  configuration VARCHAR(100) NOT NULL,
  desired_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending|approved|rejected|processing|done|error
  admin_comment TEXT,
  approved_by UUID REFERENCES tenants(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Пользователи баз 1С
CREATE TABLE db_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES databases(id),
  username VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(database_id, username)
);

-- Резервные копии
CREATE TABLE backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES databases(id),
  type VARCHAR(20) DEFAULT 'manual', -- manual|auto
  status VARCHAR(30) DEFAULT 'pending', -- pending|in_progress|done|error
  file_path TEXT,
  file_size_bytes BIGINT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Healthcheck история
CREATE TABLE healthcheck_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES databases(id),
  status VARCHAR(20) NOT NULL, -- ok|error|timeout
  response_time_ms INTEGER,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Аудит лог
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email очередь
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_body TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending|sent|error
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. API эндпоинты (Backend)

### Auth
```
POST /api/auth/register        — регистрация
POST /api/auth/verify-email    — подтверждение email
POST /api/auth/login           — вход
POST /api/auth/refresh         — обновление токена
POST /api/auth/logout          — выход
POST /api/auth/forgot-password — запрос сброса пароля
POST /api/auth/reset-password  — сброс пароля
```

### Databases (клиент)
```
GET  /api/databases            — список баз клиента
GET  /api/databases/:id        — детали базы
POST /api/databases/request    — заявка на новую базу
GET  /api/databases/:id/users  — пользователи базы
POST /api/databases/:id/users  — добавить пользователя
DELETE /api/databases/:id/users/:username — удалить пользователя
```

### Backups (клиент)
```
GET  /api/databases/:id/backups        — список бэкапов
POST /api/databases/:id/backups        — создать бэкап
GET  /api/databases/:id/backups/:bid/download — скачать бэкап
```

### Admin
```
GET  /api/admin/tenants                — все клиенты
GET  /api/admin/tenants/:id            — клиент
PATCH /api/admin/tenants/:id           — обновить (тариф, статус)
GET  /api/admin/databases              — все базы
PATCH /api/admin/databases/:id         — обновить статус базы
GET  /api/admin/requests               — заявки на базы
POST /api/admin/requests/:id/approve   — одобрить заявку
POST /api/admin/requests/:id/reject    — отклонить заявку
GET  /api/admin/healthcheck            — статус всех баз
GET  /api/admin/audit-log              — лог действий
```

---

## 6. Интеграция с 1С REST API

Управление пользователями базы осуществляется через OData REST API 1С.

```
База URL: http://<1c-server>/<base-slug>/odata/standard.odata/

Получить пользователей:
GET /Catalog_Пользователи?$format=json

Создать пользователя:
POST /Catalog_Пользователи
Body: { "Description": "Имя", "Name": "login", ... }

Удалить пользователя:
DELETE /Catalog_Пользователи(guid'...')
```

Аутентификация: Basic Auth (технический пользователь 1С).

---

## 7. Создание базы 1С через ibcmd

```bash
# Создание новой базы
ibcmd infobase create \
  --dbms=postgresql \
  --db-server=localhost \
  --db-name=portal_<slug> \
  --db-user=postgres \
  --db-pwd=<password> \
  --license-server=<server> \
  com --rac=<rac-server>:1545 \
  --cluster=<cluster-guid>

# Загрузка конфигурации из CF файла
ibcmd infobase config load \
  --data=<infobase-path> \
  --cf=/opt/1c/templates/<config>.cf
```

---

## 8. Nginx конфигурация

Домен `1c.o-horizons.com` проксируется на backend портала (порт 3010).
Фронтенд раздаётся как статика.

---

## 9. Структура файлов проекта

```
portal/
├── TZ.md                          # Это ТЗ
├── .env.example                   # Пример переменных окружения
├── docker-compose.yml             # Все сервисы
├── nginx/
│   └── 1c-portal.conf             # Nginx конфиг для 1c.o-horizons.com
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── worker.js                  # BullMQ worker точка входа
│   ├── src/
│   │   ├── app.js                 # Fastify app
│   │   ├── db/
│   │   │   └── schema.js          # Drizzle схема
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── databases.js
│   │   │   ├── backups.js
│   │   │   └── admin.js
│   │   ├── services/
│   │   │   ├── onec.service.js    # Интеграция с 1С REST API
│   │   │   ├── backup.service.js  # Управление бэкапами
│   │   │   └── mail.service.js    # Отправка email
│   │   ├── jobs/
│   │   │   ├── create-db.job.js   # Pipeline создания базы
│   │   │   └── backup.job.js      # Pipeline бэкапа
│   │   └── middleware/
│   │       ├── auth.js            # JWT middleware
│   │       └── admin.js           # Admin guard
│   ├── migrations/
│   │   └── 0001_initial.sql       # SQL миграции
│   └── scripts/
│       └── seed-plans.js          # Начальные тарифные планы
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/
│       │   └── client.js          # Axios клиент
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Dashboard.jsx
│       │   ├── DatabaseDetail.jsx
│       │   ├── Backups.jsx
│       │   └── admin/
│       │       ├── AdminDashboard.jsx
│       │       ├── AdminTenants.jsx
│       │       ├── AdminDatabases.jsx
│       │       └── AdminRequests.jsx
│       └── components/
│           ├── Layout.jsx
│           ├── DatabaseCard.jsx
│           ├── StatusBadge.jsx
│           └── BackupList.jsx
└── scripts/
    ├── create-db.sh               # Bash: создание базы 1С
    └── backup-db.sh               # Bash: бэкап базы 1С
```

---

## 10. Этапы разработки

### Этап 1 — MVP (4–5 недель)
- [ ] Backend: auth, БД, базовые роуты
- [ ] Frontend: Login, Register, Dashboard
- [ ] Docker-compose для локальной разработки
- [ ] Nginx конфиг

### Этап 2 — Управление базами (3–4 недели)
- [ ] Pipeline создания базы (BullMQ job)
- [ ] Bash скрипты ibcmd
- [ ] Интеграция REST API 1С (пользователи)
- [ ] Страница деталей базы

### Этап 3 — Бэкапы и мониторинг (2–3 недели)
- [ ] Backup service + job
- [ ] Healthcheck cron
- [ ] Страница бэкапов

### Этап 4 — Панель администратора (2 недели)
- [ ] Admin routes + middleware
- [ ] Admin UI страницы
- [ ] Обработка заявок

### Этап 5 — Тарификация и polish (2 недели)
- [ ] Проверка лимитов по тарифу
- [ ] Email уведомления
- [ ] Аудит лог
- [ ] Финальное тестирование

---

## 11. Переменные окружения

См. `portal/.env.example` для полного списка.

Ключевые группы:
- `DATABASE_URL` — подключение к PostgreSQL портала
- `REDIS_URL` — подключение к Redis (BullMQ)
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — подписание токенов
- `SMTP_*` — настройки почты
- `ONEC_SERVER_URL` — базовый URL сервера 1С
- `ONEC_ADMIN_USER`, `ONEC_ADMIN_PASS` — технический пользователь 1С
- `BACKUP_PATH` — путь хранения бэкапов
- `DEPLOY_SSH_HOST`, `DEPLOY_SSH_USER` — SSH для выполнения ibcmd
