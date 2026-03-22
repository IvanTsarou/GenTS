# Импорт истории группы (Telethon / MTProto)

Скрипт читает **всю историю** группы Telegram (сообщения с фото/видео), скачивает файлы и записывает их в поездку GenTS: Supabase + Storage, кластеризация локаций, Nominatim, Wikipedia.

---

## Пошаговая инструкция

**Если хотите сначала полностью очистить БД и потом создать поездку заново**, удобный порядок такой:

1. Шаги **1** и **2** (API Telegram + миграции Supabase).  
2. Шаг **4.1** (полный `DELETE`) + очистка Storage + шаг **4.3** (снова админ).  
3. Шаг **3** — `/tripnew` в группе, скопировать **новый** UUID поездки.  
4. Шаги **5–7** — переменные окружения, `pip`, запуск `import_group_history.py`.

Если поездка уже есть и нужен только сброс данных по ней — используйте шаг **4.2**, затем импорт с тем же `--trip-id`.

---

### Шаг 1. Telegram API (для Telethon)

1. Откройте [my.telegram.org](https://my.telegram.org).
2. Войдите по номеру телефона (код из Telegram).
3. Перейдите в **API development tools**.
4. Создайте приложение (любое имя / short name).
5. Сохраните **`api_id`** (число) и **`api_hash`** (строка).

Их нужно будет задать в переменных `TELEGRAM_API_ID` и `TELEGRAM_API_HASH` (см. шаг 5).

---

### Шаг 2. Миграции Supabase

В **Supabase → SQL Editor** по очереди выполните содержимое файлов из репозитория (если ещё не делали):

| Файл | Зачем |
|------|--------|
| `supabase/migrations/001_initial_schema.sql` | базовые таблицы |
| `supabase/migrations/002_pending_download.sql` | поля для больших видео |
| `supabase/migrations/003_media_telegram_file_unique.sql` | поле `telegram_file_unique_id` для импорта и дедупликации |

После правок нажмите **Run**.

---

### Шаг 3. Поездка и группа (после очистки БД — см. шаг 4)

Если вы делаете **полный сброс** (шаг 4.1), сначала выполните SQL и очистку Storage, **потом** заново настройте бота:

1. Добавьте бота в нужную **группу** (супергруппу), если ещё не добавлен.
2. **Администратор** должен снова появиться в таблице `users` (см. шаг 4.3) — иначе `/tripnew` не сработает.
3. В группе выполните: **`/tripnew Название поездки`** — в `trips` появится строка с **`telegram_group_id`**.
4. Скопируйте **UUID новой поездки**:
   - Supabase → **Table Editor** → `trips` → колонка `id`,  
   - или SQL:  
     `select id, name, telegram_group_id from trips order by created_at desc limit 5;`

Без привязки группы к поездке скрипт импорта не узнает, в какой чат ходить.

---

### Шаг 4. Очистка БД и Storage перед импортом

#### 4.1. Полная очистка (удалить всё — удобно перед «чистым» импортом)

Подходит, если вы **создаёте поездку заново** и только потом запускаете скрипт.

**1) SQL в Supabase → SQL Editor** (порядок строк важен):

```sql
-- Полное удаление данных приложения (структура таблиц остаётся)
DELETE FROM stories;
DELETE FROM reviews;
DELETE FROM media;
DELETE FROM locations;
DELETE FROM trips;
DELETE FROM users;
DELETE FROM bot_logs;
```

**2) Storage:** Supabase → **Storage** → бакет **`media`** → удалите папку **`trips`** целиком (или все объекты внутри), чтобы не копить старые файлы.

**3) Дальше по сценарию:** заново добавьте себя как админа (шаг 4.3), затем **шаг 3** (`/tripnew`), потом импорт с **новым** `--trip-id`.

---

#### 4.2. Только одна поездка (перезапуск импорта без удаления `trips`)

Если поездка уже есть и нужно только сбросить медиа/локации по **этой** поездке, подставьте `ВАШ_TRIP_UUID`:

```sql
DO $$
DECLARE
  tid uuid := 'ВАШ_TRIP_UUID'::uuid;
BEGIN
  DELETE FROM stories WHERE trip_id = tid;
  DELETE FROM reviews WHERE trip_id = tid;
  DELETE FROM media WHERE trip_id = tid;
  DELETE FROM locations WHERE trip_id = tid;
END $$;
```

Строку в **`trips` не удаляйте** — сохранится `telegram_group_id`. В Storage удалите папку `trips/ВАШ_TRIP_UUID/`, если хотите убрать старые файлы.

---

#### 4.3. После полной очистки: снова админ в `users`

Команда `/tripnew` доступна только **верифицированному админу**. После `DELETE FROM users` его нужно создать снова.

**Через API** (как в корневом `README.md`), подставьте свой `telegram_id` и `ADMIN_TOKEN`:

```bash
curl -X POST https://ваш-домен.vercel.app/api/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"telegram_id": 123456789, "name": "Admin", "is_verified": true, "is_admin": true}'
```

Либо в **Supabase → Table Editor → `users`** вручную вставьте строку с вашим `telegram_id`, `is_verified = true`, `is_admin = true`.

Остальные участники группы снова появятся при работе бота или при импорте.

---

### Шаг 5. Переменные окружения

В терминале (или в `.env` в корне проекта и `export $(cat .env.local | xargs)` — осторожно с кавычками):

```env
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abcdef0123456789abcdef0123456789
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # service role, не anon
NOMINATIM_USER_AGENT=gents-import-yourname
```

`SUPABASE_SERVICE_ROLE_KEY` нужен для записи в БД и загрузки в Storage (как у бота на сервере).

---

### Шаг 6. Установка Python-зависимостей

```bash
cd scripts/import-group-history
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Рекомендуется **Python 3.10+**.

---

### Шаг 7. Первый запуск и сессия Telethon

```bash
cd scripts/import-group-history
source .venv/bin/activate

export TELEGRAM_API_ID=...
export TELEGRAM_API_HASH=...
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...

# сначала тест на 3–5 файлах
python import_group_history.py --trip-id ВАШ_TRIP_UUID --limit 5

# полный импорт
python import_group_history.py --trip-id ВАШ_TRIP_UUID
```

При первом запуске скрипт спросит **номер телефона** (международный формат, например `+79001234567`) и **код из Telegram**. Создаётся файл сессии `gents_import_session` — **не публикуйте и не коммитьте** его (уже в `.gitignore`).

Аккаунт Telegram должен быть **участником** этой группы и видеть историю сообщений.

---

### Шаг 8. Опции командной строки

| Опция | Описание |
|--------|----------|
| `--trip-id` | UUID поездки (**обязательно**) |
| `--limit N` | Обработать только первые N медиа (тест) |
| `--dry-run` | Не писать в БД; нужен `IMPORT_CHAT_ID` = id группы |
| `--skip-videos` | Импортировать только фото |

---

### Шаг 9. Повторный запуск

Если **не** чистили БД, скрипт пропустит уже импортированные файлы по полю `telegram_file_unique_id`.

Если нужен **полный перезалив медиа** — выполните **4.2** (только эта поездка) или **4.1** (всё с нуля + снова админ и `/tripnew`), при необходимости удалите файлы в Storage, затем снова запустите скрипт (шаг 7).

---

## Ограничения

- **Nominatim:** между запросами есть пауза (~1 с) — большие чаты идут долго.
- **HEIC:** для конвертации может понадобиться `pillow-heif` и системный `libheif` (например macOS: `brew install libheif`).
- История читается **только для сообщений, доступных вашему аккаунту** в Telethon (как в клиенте Telegram).
- **Размер файлов в Storage:** на проекте Supabase есть лимит на один объект (часто **50 MB** на бесплатном плане). Если загрузка возвращает **413**, такое видео **полностью пропускается** (ни Storage, ни локальный диск, ни строка в БД). Фото при 413 тоже пропускаются. Лимит можно поднять в **Supabase Dashboard → Project Settings → Storage** (или сменить тариф).
