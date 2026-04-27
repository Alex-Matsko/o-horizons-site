# O-Horizons 1C Portal

SaaS-портал для управления базами 1С. Доступен по адресу [1c.o-horizons.com](https://1c.o-horizons.com).

## Структура

```
portal/
├── backend/          # Node.js + Fastify API (порт 3001)
├── frontend/         # React 18 + Vite SPA
├── scripts/          # Bash-скрипты для сервера 1С
├── .env.example      # Шаблон переменных окружения
└── README.md
```

## Быстрый старт

### 1. Переменные окружения

```bash
cp portal/.env.example portal/.env
# Заполнить все значения в portal/.env
```

### 2. Первый запуск

```bash
# Поднять контейнеры
docker-compose up -d portal-db portal-redis

# Применить миграции БД
docker-compose run --rm portal-api node src/migrations/run.js

# Поднять всё
docker-compose up -d
```

### 3. SSL для 1c.o-horizons.com

```bash
certbot certonly --webroot -w /var/www/html -d 1c.o-horizons.com
```

### 4. Скрипты на сервере 1С

Скопировать содержимое `portal/scripts/` на сервер 1С в `/opt/portal/scripts/`  
и выдать права:

```bash
chmod +x /opt/portal/scripts/*.sh
chown root:root /opt/portal/scripts/*.sh
# В /etc/sudoers.d/portal_deploy:
# portal_deploy ALL=(root) NOPASSWD: /opt/portal/scripts/*.sh
```

## Сервисы

| Сервис | Контейнер | Назначение |
|---|---|---|
| `portal-api` | Node.js Fastify | REST API |
| `portal-worker` | Node.js BullMQ | Async jobs (provision, backup) |
| `portal-frontend` | React + nginx | SPA |
| `portal-db` | PostgreSQL 16 | База портала |
| `portal-redis` | Redis 7 | Очереди BullMQ + кэш |

## API Endpoints

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/auth/register` | Регистрация |
| GET | `/api/auth/verify-email` | Подтверждение email |
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/refresh` | Обновление токена |
| GET | `/api/auth/me` | Профиль |
| GET | `/api/databases` | Список баз |
| POST | `/api/databases/request` | Заказать базу |
| GET | `/api/databases/:id` | Детали базы |
| GET | `/api/databases/:id/health` | История uptime |
| GET | `/api/databases/:dbId/users` | Пользователи 1С |
| POST | `/api/databases/:dbId/users` | Создать пользователя |
| DELETE | `/api/databases/:dbId/users/:login` | Удалить пользователя |
| GET | `/api/backups` | Список бекапов |
| POST | `/api/backups` | Запустить бекап |
| GET | `/api/backups/:id/download` | Скачать бекап |
| GET | `/api/admin/requests` | Заявки (admin) |
| POST | `/api/admin/requests/:id/approve` | Подтвердить заявку |
| POST | `/api/admin/requests/:id/reject` | Отклонить заявку |
