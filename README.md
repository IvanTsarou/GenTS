# GenTS — Travel Story Generator

Telegram-бот для сбора фотографий, голосовых и текстовых заметок из путешествий с автоматической структуризацией по датам и локациям.

## Возможности

- 📸 Приём фото с автоматическим извлечением EXIF (дата, GPS)
- 🎤 Приём голосовых сообщений
- ✍️ Приём текстовых отзывов
- 📍 Автоматическая кластеризация локаций (радиус 200м)
- 🌍 Обогащение локаций через Nominatim и Wikipedia
- 👥 Поддержка личного и группового режимов
- 🔐 Whitelist-авторизация пользователей

## Технологии

- **Runtime:** Next.js 14 (App Router) на Vercel
- **Telegram Bot:** grammy (webhook-режим)
- **База данных:** Supabase (PostgreSQL)
- **Хранение файлов:** Supabase Storage
- **Геокодинг:** Nominatim (OpenStreetMap)
- **EXIF:** exifr
- **Thumbnails:** sharp

## Быстрый старт

### 1. Клонирование и установка

```bash
git clone https://github.com/IvanTsarou/GenTS.git
cd GenTS
npm install
```

### 2. Настройка переменных окружения

Скопируйте `.env.example` в `.env.local` и заполните:

```bash
cp .env.example .env.local
```

```env
# Telegram Bot (получить у @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_SECRET=your_random_secret

# Supabase (из настроек проекта)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Геокодинг
NOMINATIM_USER_AGENT=gents-travel-bot

# Админ
ADMIN_TOKEN=your_admin_token

# URL приложения (после деплоя на Vercel)
APP_URL=https://your-app.vercel.app
```

### 3. Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. Откройте SQL Editor и выполните миграцию из `supabase/migrations/001_initial_schema.sql`
3. Создайте Storage bucket с именем `media` (публичный)

### 4. Локальная разработка

Для локальной разработки нужен публичный URL для webhook. Используйте ngrok:

```bash
# Терминал 1: запуск приложения
npm run dev

# Терминал 2: ngrok туннель
ngrok http 3000
```

Установите webhook на ngrok URL:

```bash
APP_URL=https://xxx.ngrok.io npm run setup-webhook
```

### 5. Деплой на Vercel

1. Подключите репозиторий к [Vercel](https://vercel.com)
2. Добавьте переменные окружения в настройках проекта
3. После деплоя зарегистрируйте webhook:

```bash
APP_URL=https://your-app.vercel.app npm run setup-webhook
```

## Команды бота

| Команда | Описание |
|---------|----------|
| `/start` | Приветствие и регистрация |
| `/status` | Статистика текущей поездки |
| `/locations` | Список локаций |
| `/tripnew [название]` | Создать поездку (только admin) |
| `/triplist` | Список поездок |
| `/generate` | Сгенерировать story |
| `/help` | Справка |

## API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/webhook/telegram` | Webhook для Telegram |
| GET | `/api/trip/:id/structured` | Структурированные данные поездки |
| GET | `/api/trip/:id/locations` | Список локаций |
| POST | `/api/trip/:id/generate` | Запуск генерации story |
| GET | `/api/trip/:id/story` | Получить story |
| GET | `/api/admin/users` | Список пользователей |
| POST | `/api/admin/users` | Добавить пользователя |
| DELETE | `/api/admin/users/:id` | Удалить пользователя |

## Управление пользователями

Добавить администратора:

```bash
curl -X POST https://your-app.vercel.app/api/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"telegram_id": 123456789, "name": "Admin", "is_verified": true, "is_admin": true}'
```

Верифицировать пользователя:

```bash
curl -X PATCH https://your-app.vercel.app/api/admin/users/USER_UUID \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_verified": true}'
```

## Лимиты

- 3 фото на локацию от одного пользователя
- 3 отзыва на локацию от одного пользователя (текст + аудио суммарно)

## Структура проекта

```
GenTS/
├── app/
│   ├── api/
│   │   ├── webhook/telegram/     # Telegram webhook
│   │   ├── trip/[id]/            # Trip API
│   │   └── admin/users/          # Admin API
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── bot/                      # Telegram bot logic
│   │   ├── commands.ts
│   │   ├── handlers/
│   │   └── middleware/
│   ├── supabase.ts               # Database client
│   ├── exif.ts                   # EXIF extraction
│   ├── thumbnails.ts             # Image processing
│   ├── geocoding.ts              # Nominatim API
│   ├── wikipedia.ts              # Wikipedia API
│   ├── clustering.ts             # Location clustering
│   ├── storage.ts                # Supabase Storage
│   └── logger.ts                 # Bot logging
├── supabase/
│   └── migrations/               # SQL migrations
├── scripts/
│   └── setup-webhook.js          # Webhook setup script
└── vercel.json                   # Vercel config
```

## Лицензия

MIT
