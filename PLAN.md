# GenTS (Travel Story Generator) — План реализации v1.0

**Репозиторий:** https://github.com/IvanTsarou/GenTS

## Обзор проекта

Telegram-бот для сбора фотографий, голосовых и текстовых заметок из путешествий с автоматической структуризацией по датам/локациям.

## Принятые решения

- **Транскрипция/генерация:** обработка данных после поездки через IDE (Cursor Pro AI-интеграции)
- **Привязка отзывов к дню:** добавлено поле `day_date` в таблицу `reviews`
- **Активная поездка:** одна активная поездка, создаётся только администратором
- **Групповой режим:** 1 группа = 1 поездка (связь через `telegram_group_id` в таблице `trips`)
- **Thumbnails:** генерируются на сервере через sharp

---

## Фаза 1: Инициализация проекта

- [x] 1. Создать Next.js проект с App Router и TypeScript
- [x] 2. Настроить структуру папок и базовые конфиги
- [x] 3. Добавить `vercel.json` с настройками функций
- [x] 4. Создать `.env.example` с перечнем переменных
- [x] 5. Установить зависимости: `grammy`, `@supabase/supabase-js`, `exifr`, `sharp`

## Фаза 2: База данных (Supabase)

- [x] 6. Создать SQL-миграцию со всеми таблицами:
  - `users` (telegram_id, name, is_verified, is_admin)
  - `trips` (name, created_by, status, telegram_group_id)
  - `locations` (trip_id, name, address, country, city, lat, lng, description, wiki_url, place_type)
  - `media` (trip_id, location_id, user_id, file_url, thumbnail_url, shot_at, lat, lng, caption)
  - `reviews` (trip_id, location_id, user_id, text, format, audio_url, day_date)
  - `bot_logs` (telegram_user_id, message_type, payload)
- [ ] 7. Настроить Storage bucket для медиафайлов (вручную в Supabase)

## Фаза 3: Утилиты и сервисы

- [x] 8. Supabase клиент (`lib/supabase.ts`)
- [x] 9. EXIF-парсер (`lib/exif.ts`)
- [x] 10. Генератор thumbnails через sharp (`lib/thumbnails.ts`)
- [x] 11. Reverse geocoding через Nominatim (`lib/geocoding.ts`)
- [x] 12. Wikipedia API клиент (`lib/wikipedia.ts`)
- [ ] 13. Google Places API клиент (`lib/places.ts`) — опционально (не реализовано)
- [x] 14. Кластеризация координат (`lib/clustering.ts`)
- [x] 15. Логгер для bot_logs (`lib/logger.ts`)

## Фаза 4: Telegram Bot

- [x] 16. Webhook endpoint (`app/api/webhook/telegram/route.ts`)
- [x] 17. Верификация пользователей (middleware)
- [x] 18. Команды бота:
  - `/start` — приветствие
  - `/status` — статистика
  - `/locations` — список локаций
  - `/generate` — заглушка генерации
  - `/trip new [название]` — создание поездки (только admin)
  - `/trip list` — список поездок
- [x] 19. Обработка фото:
  - Извлечение EXIF
  - Запрос геолокации если нет GPS
  - Запрос даты если нет в EXIF
  - Загрузка в Storage + генерация thumbnail
  - Кластеризация и привязка к локации
  - Обогащение новой локации (geocoding, Wikipedia)
  - Проверка лимита 3 фото на локацию
- [x] 20. Обработка текстовых отзывов:
  - Привязка к локации (reply или последняя активная)
  - Проверка лимита 3 отзыва
- [x] 21. Обработка голосовых:
  - Сохранение аудио в Storage
  - Транскрипция (заглушка — для production через OpenAI API)
  - Сохранение как отзыв с format='audio'
- [x] 22. Определение активной поездки:
  - Личный чат: последняя активная поездка пользователя
  - Групповой чат: поездка, привязанная к группе

## Фаза 5: API Endpoints

- [x] 23. `GET /api/trip/:id/structured` — структурированные данные
- [x] 24. `GET /api/trip/:id/locations` — список локаций
- [x] 25. `POST /api/trip/:id/generate` — заглушка генерации
- [x] 26. `GET /api/trip/:id/story` — получение story (заглушка)
- [x] 27. `POST /api/admin/users` — добавление в whitelist
- [x] 28. `DELETE /api/admin/users/:id` — удаление из whitelist

## Фаза 6: Деплой и документация

- [x] 29. Скрипт `scripts/setup-webhook.js`
- [x] 30. README.md с инструкциями

---

## Структура проекта

```
GenTS/
├── app/
│   └── api/
│       ├── webhook/
│       │   └── telegram/
│       │       └── route.ts
│       ├── trip/
│       │   └── [id]/
│       │       ├── structured/route.ts
│       │       ├── locations/route.ts
│       │       ├── generate/route.ts
│       │       └── story/route.ts
│       └── admin/
│           └── users/
│               ├── route.ts
│               └── [id]/route.ts
├── lib/
│   ├── supabase.ts
│   ├── bot/
│   │   ├── index.ts
│   │   ├── commands.ts
│   │   ├── handlers/
│   │   │   ├── photo.ts
│   │   │   ├── voice.ts
│   │   │   └── text.ts
│   │   └── middleware/
│   │       └── auth.ts
│   ├── exif.ts
│   ├── thumbnails.ts
│   ├── geocoding.ts
│   ├── wikipedia.ts
│   ├── places.ts
│   ├── clustering.ts
│   └── logger.ts
├── scripts/
│   └── setup-webhook.js
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.example
├── vercel.json
├── package.json
└── README.md
```

---

## Переменные окружения

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NOMINATIM_USER_AGENT=travel-story-bot
GOOGLE_MAPS_API_KEY=          # опционально
ADMIN_TOKEN=
```
