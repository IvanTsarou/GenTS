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
- **Travel Story UI:** Tailwind CSS 4, Radix UI, Framer Motion (scrapbook)
- **Telegram Bot:** grammy (webhook-режим)
- **База данных:** Supabase (PostgreSQL)
- **Хранение файлов:** Supabase Storage
- **Геокодинг:** Nominatim (OpenStreetMap)
- **EXIF:** exifr
- **Thumbnails:** sharp

## Travel Story (веб)

Интерактивная «история путешествия» в одном приложении с ботом:

| URL / API | Назначение |
|-----------|------------|
| `/` | Главная, ссылка на демо |
| `/story/demo` | Демо без базы (мок-данные) |
| `/story/<uuid>` | История по `trips.id` из Supabase |
| `GET /api/trip/<id>/travel-story` | JSON для UI (снимок или сборка из медиа/локаций/отзывов) |
| `PATCH /api/trip/<id>/travel-story` | Сохранить отредактированный JSON в `trips.story_snapshot` |
| `POST /api/trip/<id>/travel-story/bootstrap` | Один раз собрать историю из БД и записать в `story_snapshot` (Bearer `STORY_EDIT_TOKEN`; `?force=1` — перезапись) |

**Визуальная тема:** палитра в `app/globals.css` заточена под **Оман / ОАЭ / Персидский залив** (песок, известняк, бирюза моря, терракотовый закат, красный акцент как на флаге).

**Миграция:** выполните `supabase/migrations/005_trip_story_snapshot.sql` (поля `story_snapshot`, `story_snapshot_updated_at`). Без неё запрос к `trips` падает → страница `/story/<uuid>` даст **404**.

**Сохранение / bootstrap и токены**

| Окружение | Поведение |
|-----------|-----------|
| **Production** | Обязательны `STORY_EDIT_TOKEN` и совпадающий `Authorization: Bearer …` для `PATCH` и `POST …/bootstrap`. В браузере задайте тот же секрет в `NEXT_PUBLIC_STORY_EDIT_TOKEN`. |
| **Development (`npm run dev`)** | Если заголовок **не** передан — `PATCH` и `bootstrap` **разрешены** (удобно без дублирования токена в клиент). Если заголовок передан — он должен совпасть с `STORY_EDIT_TOKEN`. |

**Если «не работает»**

1. **404 на `/story/<uuid>`** — проверьте UUID поездки в Supabase; в терминале dev смотрите лог `[getTravelStoryByTripId] …` (причина из PostgREST).
2. **Колонки snapshot** — применена ли миграция `005_trip_story_snapshot.sql`.
3. **`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`** в `.env.local` (без них сервер падает при обращении к БД).
4. **Картинки не грузятся** — в `next.config.js` разрешены URL `*.supabase.co/storage/v1/object/**` (в т.ч. signed).
5. **Bootstrap 409** — в БД уже есть `story_snapshot`; используйте `POST …/bootstrap?force=1`.
6. **Production + 401 при сохранении** — выставьте `NEXT_PUBLIC_STORY_EDIT_TOKEN` равным `STORY_EDIT_TOKEN`.

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
2. Откройте SQL Editor и выполните миграции по порядку из `supabase/migrations/` (`001` … `005`)
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

- Видео до 20 MB загружаются сразу
- Видео больше 20 MB регистрируются для отложенного скачивания
- В группе бот принимает медиа от всех участников без ограничений

## Импорт истории группы (Telethon)

Если в группе уже были фото/видео до подключения бота, их можно подтянуть отдельным скриптом (MTProto, ваш аккаунт Telegram):

См. **[scripts/import-group-history/README.md](scripts/import-group-history/README.md)** — пошаговая инструкция, очистка БД и Storage перед импортом, миграции, переменные окружения, запуск.

## Скачивание больших файлов

Большие видео (>20 MB) сохраняются как ссылки на Telegram и скачиваются после поездки:

```bash
# Показать список ожидающих файлов
node scripts/download-pending-media.js --list

# Скачать все файлы
node scripts/download-pending-media.js

# Скачать и загрузить в Supabase Storage
node scripts/download-pending-media.js --upload

# Скачать только для конкретной поездки
node scripts/download-pending-media.js --trip-id <uuid> --upload
```

Файлы сохраняются в папку `downloads/`.

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
│   ├── setup-webhook.js          # Webhook setup script
│   └── download-pending-media.js # Download large files
└── vercel.json                   # Vercel config
```

## Лицензия

MIT
