#!/usr/bin/env python3
"""
Импорт истории группы Telegram в поездку GenTS через MTProto (Telethon).

Требует: API ID / API Hash с https://my.telegram.org
Первый запуск: авторизация по номеру телефона и коду из Telegram.

Использование:
  cd scripts/import-group-history
  python3 -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  cp ../../.env.local .env   # или задайте переменные вручную
  python import_group_history.py --trip-id <UUID>

Опции:
  --trip-id       UUID поездки (обязательно), у поездки должен быть telegram_group_id
  --limit N       обработать только N медиа (для теста)
  --dry-run       только лог, без записи в Supabase
  --skip-videos   не импортировать видео
"""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import io
import math
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import quote

import exifread
import requests
from dotenv import load_dotenv
from PIL import Image, ImageOps
from supabase import create_client
from telethon import TelegramClient
from telethon.tl.types import (
    DocumentAttributeFilename,
    MessageMediaDocument,
    MessageMediaPhoto,
)

# Опционально HEIC (macOS / Linux с libheif)
try:
    import pillow_heif

    pillow_heif.register_heif_opener()
    HAS_HEIF = True
except Exception:
    # Если pillow-heif не установлен или не работает на текущей платформе,
    # то HEIC/HEIF (часто с iPhone) не распознаются Pillow и будут пропущены.
    print(
        "HEIC/HEIF поддержка Pillow отключена: не удалось импортировать pillow-heif. "
        "Фото с iPhone (HEIC) будут пропускаться. "
        "Установите pillow-heif (и при необходимости system libheif).",
        file=sys.stderr,
    )
    HAS_HEIF = False

CLUSTER_RADIUS_M = 500
EARTH_R_M = 6371000
NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
THUMB_MAX = 400


@contextlib.contextmanager
def _telethon_import_lock(script_dir: str):
    """
    Только один процесс импорта: Telethon хранит сессию в SQLite (gents_import_session.session).
    Два параллельных запуска → sqlite3.OperationalError: database is locked и «wrong session ID».
    """
    try:
        import fcntl  # type: ignore[attr-defined]
    except ImportError:
        print(
            "Предупреждение: fcntl недоступен — второй параллельный импорт не блокируется.",
            file=sys.stderr,
        )
        yield
        return

    lock_path = os.path.join(script_dir, "gents_import_session.lock")
    fp = open(lock_path, "a+")
    try:
        fcntl.flock(fp.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        fp.close()
        print(
            "Уже запущен другой импорт (или завершите зависший процесс).\n"
            "Не запускайте два раза import_group_history.py — один файл сессии Telethon.\n"
            "Иначе: sqlite database is locked, Security error / wrong session ID.",
            file=sys.stderr,
        )
        raise SystemExit(1)
    try:
        yield
    finally:
        try:
            fcntl.flock(fp.fileno(), fcntl.LOCK_UN)
            fp.close()
        except Exception:
            pass


def load_env() -> None:
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    for name in (".env.local", ".env"):
        p = os.path.join(root, name)
        if os.path.isfile(p):
            load_dotenv(p)
            return
    load_dotenv()


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlng / 2) ** 2
    return EARTH_R_M * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def extract_exif_exifread(data: bytes) -> tuple[Optional[tuple[float, float]], Optional[datetime]]:
    """GPS + дата съёмки из EXIF (JPEG и часть других форматов)."""
    coords: Optional[tuple[float, float]] = None
    taken: Optional[datetime] = None
    try:
        tags = exifread.process_file(io.BytesIO(data), details=False)
    except Exception:
        return None, None

    def ratio_to_float(r) -> float:
        if hasattr(r, "num") and hasattr(r, "den"):
            return float(r.num) / float(r.den) if r.den else float(r.num)
        nums = getattr(r, "values", None) or r
        if isinstance(nums, (list, tuple)) and len(nums) >= 3:
            return float(nums[0]) + float(nums[1]) / 60.0 + float(nums[2]) / 3600.0
        return float(nums)

    lat_tag = tags.get("GPS GPSLatitude")
    lat_ref = tags.get("GPS GPSLatitudeRef")
    lng_tag = tags.get("GPS GPSLongitude")
    lng_ref = tags.get("GPS GPSLongitudeRef")
    if lat_tag and lng_tag and lat_ref and lng_ref:
        try:
            lat = ratio_to_float(lat_tag.values[0])
            lng = ratio_to_float(lng_tag.values[0])
            if str(lat_ref) in ("S", b"S"):
                lat = -lat
            if str(lng_ref) in ("W", b"W"):
                lng = -lng
            coords = (lat, lng)
        except Exception:
            pass

    for key in ("EXIF DateTimeOriginal", "EXIF DateTimeDigitized", "Image DateTime"):
        dt_tag = tags.get(key)
        if not dt_tag:
            continue
        try:
            s = str(dt_tag.values).strip("'\"") if hasattr(dt_tag, "values") else str(dt_tag)
            if len(s) >= 19:
                taken = datetime.strptime(s[:19], "%Y:%m:%d %H:%M:%S").replace(tzinfo=timezone.utc)
            break
        except Exception:
            pass

    return coords, taken


def process_image_to_jpeg(data: bytes) -> tuple[bytes, bytes]:
    """Оригинал JPEG + миниатюра (как в Node sharp pipeline, упрощённо)."""
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    elif img.mode == "L":
        img = img.convert("RGB")

    out_orig = io.BytesIO()
    img.save(out_orig, format="JPEG", quality=90, optimize=True)
    original_bytes = out_orig.getvalue()

    thumb_img = Image.open(io.BytesIO(original_bytes))
    thumb_img.thumbnail((THUMB_MAX, THUMB_MAX), Image.Resampling.LANCZOS)
    out_thumb = io.BytesIO()
    thumb_img.save(out_thumb, format="JPEG", quality=80, optimize=True)
    return original_bytes, out_thumb.getvalue()


def reverse_geocode(lat: float, lng: float, user_agent: str) -> Optional[dict[str, Any]]:
    url = f"{NOMINATIM_BASE}/reverse"
    params = {
        "lat": lat,
        "lon": lng,
        "format": "json",
        "addressdetails": "1",
        "accept-language": "ru,en",
    }
    r = requests.get(url, params=params, headers={"User-Agent": user_agent}, timeout=30)
    time.sleep(1.1)  # лимит Nominatim
    if r.status_code != 200:
        return None
    data = r.json()
    if not data or data.get("error"):
        return None
    addr = data.get("address") or {}
    name = data.get("name") or (data.get("display_name") or "").split(",")[0] or "Unknown"
    city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("municipality") or ""
    return {
        "name": name,
        "address": data.get("display_name") or "",
        "city": city,
        "country": addr.get("country") or "",
    }


def search_wikipedia(query: str, user_agent: str) -> Optional[dict[str, str]]:
    for lang, base in (("ru", "https://ru.wikipedia.org/w/api.php"), ("en", "https://en.wikipedia.org/w/api.php")):
        r = requests.get(
            base,
            params={
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srlimit": "1",
                "format": "json",
                "origin": "*",
            },
            headers={"User-Agent": user_agent},
            timeout=30,
        )
        time.sleep(0.5)
        if r.status_code != 200:
            continue
        js = r.json()
        sr = js.get("query", {}).get("search") or []
        if not sr:
            continue
        title = sr[0]["title"]
        r2 = requests.get(
            base,
            params={
                "action": "query",
                "titles": title,
                "prop": "extracts",
                "exintro": "1",
                "explaintext": "1",
                "exsentences": "3",
                "format": "json",
                "origin": "*",
            },
            headers={"User-Agent": user_agent},
            timeout=30,
        )
        time.sleep(0.5)
        if r2.status_code != 200:
            continue
        pages = r2.json().get("query", {}).get("pages") or {}
        for pid, page in pages.items():
            if pid == "-1":
                continue
            desc = page.get("extract") or ""
            enc = quote(title.replace(" ", "_"), safe="")
            return {
                "description": desc,
                "url": f"https://{lang}.wikipedia.org/wiki/{enc}",
            }
    return None


def find_nearest_location(
    lat: float, lng: float, locations: list[dict[str, Any]]
) -> Optional[dict[str, Any]]:
    best: Optional[dict[str, Any]] = None
    best_d = float("inf")
    for loc in locations:
        la, ln = loc.get("lat"), loc.get("lng")
        if la is None or ln is None:
            continue
        d = haversine_m(lat, lng, float(la), float(ln))
        if d <= CLUSTER_RADIUS_M and d < best_d:
            best_d = d
            best = loc
    return best


def get_or_create_user(sb: Any, sender: Any, dry: bool) -> Optional[str]:
    if not sender:
        return None
    tid = int(sender.id)
    name = (getattr(sender, "first_name", None) or "") + (
        (" " + getattr(sender, "last_name")) if getattr(sender, "last_name", None) else ""
    )
    uname = getattr(sender, "username", None)
    if dry:
        return str(uuid.uuid4())
    r = sb.table("users").select("id").eq("telegram_id", tid).execute()
    if r.data:
        uid = r.data[0]["id"]
        sb.table("users").update(
            {"name": name or None, "username": uname, "is_verified": True}
        ).eq("id", uid).execute()
        return uid
    ins = (
        sb.table("users")
        .insert(
            {
                "telegram_id": tid,
                "name": name.strip() or None,
                "username": uname,
                "is_verified": True,
                "is_admin": False,
            }
        )
        .execute()
    )
    if not ins.data:
        return None
    return ins.data[0]["id"]


def media_dedup_key(msg: Any) -> str:
    media = msg.media
    if isinstance(media, MessageMediaPhoto) and media.photo:
        p = media.photo
        uid = getattr(p, "file_unique_id", None)
        if uid:
            return str(uid)
    if isinstance(media, MessageMediaDocument) and media.document:
        d = media.document
        uid = getattr(d, "file_unique_id", None)
        if uid:
            return str(uid)
    return f"msg:{msg.chat_id}:{msg.id}"


def already_imported(sb: Any, trip_id: str, key: str, dry: bool) -> bool:
    if dry:
        return False
    r = sb.table("media").select("id").eq("trip_id", trip_id).eq("telegram_file_unique_id", key).execute()
    return bool(r.data)


def _is_storage_payload_too_large(exc: BaseException) -> bool:
    """Supabase Storage: 413 при превышении лимита размера объекта."""
    s = str(exc).lower()
    if "413" in s or "payload too large" in s or "too large" in s or "maximum allowed size" in s:
        return True
    args = getattr(exc, "args", None)
    if args and isinstance(args[0], dict):
        return args[0].get("statusCode") == 413
    return False


def _is_transient_read_timeout(exc: BaseException) -> bool:
    """
    Supabase Storage upload иногда падает по таймауту чтения ответа.
    Это чаще временная проблема сети/загрузки, поэтому делаем retry.
    """
    s = str(exc).lower()
    return "readtimeout" in s or "read operation timed out" in s or "timed out" in s or "timeout" in s


def upload_storage(sb: Any, path: str, data: bytes, content_type: str) -> Optional[str]:
    """Загрузка в Storage. Возвращает None при 413 (файл слишком большой для лимита проекта)."""
    attempts = 4
    for attempt in range(attempts):
        try:
            sb.storage.from_("media").upload(
                path,
                data,
                file_options={"content-type": content_type, "upsert": "true"},
            )
            pub = sb.storage.from_("media").get_public_url(path)
            if isinstance(pub, dict):
                return pub.get("publicUrl") or pub.get("public_url")
            return str(pub) if pub else None
        except Exception as e:
            if _is_storage_payload_too_large(e):
                return None
            if _is_transient_read_timeout(e) and attempt < attempts - 1:
                sleep_s = 2**attempt
                print(
                    f"Storage upload timeout, retrying ({attempt + 1}/{attempts}) in {sleep_s}s: {e}",
                    file=sys.stderr,
                )
                time.sleep(sleep_s)
                continue
            raise


async def run() -> int:
    load_env()
    parser = argparse.ArgumentParser(description="Импорт истории группы в GenTS")
    parser.add_argument("--trip-id", required=True, help="UUID поездки")
    parser.add_argument("--limit", type=int, default=0, help="Макс. число медиа (0 = без лимита)")
    parser.add_argument("--dry-run", action="store_true", help="Не писать в БД")
    parser.add_argument("--skip-videos", action="store_true", help="Пропускать видео")
    args = parser.parse_args()

    api_id = os.environ.get("TELEGRAM_API_ID")
    api_hash = os.environ.get("TELEGRAM_API_HASH")
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    ua = os.environ.get("NOMINATIM_USER_AGENT", "gents-import-script")

    if not api_id or not api_hash:
        print("Задайте TELEGRAM_API_ID и TELEGRAM_API_HASH (https://my.telegram.org)", file=sys.stderr)
        return 1
    if not args.dry_run and (not supabase_url or not supabase_key):
        print("Задайте SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1

    sb = create_client(supabase_url, supabase_key) if not args.dry_run else None

    trip_id = args.trip_id.strip()
    if not args.dry_run:
        tr = sb.table("trips").select("id,telegram_group_id,name").eq("id", trip_id).limit(1).execute()
        if not tr.data:
            print("Поездка не найдена", file=sys.stderr)
            return 1
        trip = tr.data[0]
        gid = trip.get("telegram_group_id")
        if not gid:
            print("У поездки нет telegram_group_id. Создайте поездку командой /tripnew в группе.", file=sys.stderr)
            return 1
        chat_id = int(gid)
        print(f"Поездка: {trip.get('name')} | группа chat_id={chat_id}")
    else:
        chat_id = int(os.environ.get("IMPORT_CHAT_ID", "0"))
        if not chat_id:
            print("В режиме --dry-run укажите IMPORT_CHAT_ID для подключения к чату", file=sys.stderr)
            return 1

    script_dir = os.path.dirname(os.path.abspath(__file__))
    session_path = os.path.join(script_dir, "gents_import_session")
    client = TelegramClient(session_path, int(api_id), api_hash)

    processed = 0
    skipped_dup = 0

    with _telethon_import_lock(script_dir):
        async with client:
            await client.start()
            entity = await client.get_entity(chat_id)

            # Сообщения от старых к новым (как хронология поездки)
            async for msg in client.iter_messages(entity, reverse=True):
                if not msg.media:
                    continue
                if args.limit and processed >= args.limit:
                    break

                is_photo = isinstance(msg.media, MessageMediaPhoto)
                is_doc = isinstance(msg.media, MessageMediaDocument)
                if not is_photo and not is_doc:
                    continue

                mime_early = ""
                if is_doc and msg.media.document:
                    mime_early = getattr(msg.media.document, "mime_type", "") or ""

                if args.skip_videos and mime_early.startswith("video/"):
                    continue

                dedup = media_dedup_key(msg)
                if not args.dry_run and already_imported(sb, trip_id, dedup, False):
                    skipped_dup += 1
                    continue

                sender = await msg.get_sender()
                user_id = get_or_create_user(sb, sender, args.dry_run)
                if not user_id and not args.dry_run:
                    print(f"Пропуск msg {msg.id}: не удалось создать пользователя")
                    continue

                try:
                    bio = io.BytesIO()
                    await client.download_media(msg, file=bio)
                    raw = bio.getvalue()
                except Exception as e:
                    print(f"Скачивание msg {msg.id}: {e}")
                    continue

                if not raw:
                    continue

                caption = msg.message or None

                # Фото (включая документ-картинку)
                if is_photo or (
                    is_doc
                    and msg.media.document
                    and (getattr(msg.media.document, "mime_type", "") or "").startswith("image/")
                ):
                    coords, taken = extract_exif_exifread(raw)

                    try:
                        orig_jpeg, thumb_jpeg = process_image_to_jpeg(raw)
                    except Exception as e:
                        if not HAS_HEIF:
                            print(
                                f"HEIC/HEIF вероятен у msg {msg.id} (iPhone): "
                                f"пропуск конвертации (pillow-heif не работает). Ошибка: {e}",
                                file=sys.stderr,
                            )
                        else:
                            print(f"Изображение msg {msg.id}, пропуск конвертации: {e}")
                        continue

                    media_id = str(uuid.uuid4())
                    if args.dry_run:
                        print(f"[dry] photo msg={msg.id} unique={dedup} coords={coords}")
                        processed += 1
                        continue

                    path_o = f"trips/{trip_id}/photos/{media_id}.jpg"
                    path_t = f"trips/{trip_id}/thumbnails/{media_id}.jpg"
                    file_url = upload_storage(sb, path_o, orig_jpeg, "image/jpeg")
                    thumb_url = upload_storage(sb, path_t, thumb_jpeg, "image/jpeg")
                    if file_url is None or thumb_url is None:
                        print(
                            f"Пропуск фото msg {msg.id}: лимит размера Storage (413). "
                            f"Увеличьте лимит в Supabase → Project Settings → Storage или уменьшите файл."
                        )
                        continue
                    if not file_url or not thumb_url:
                        print(f"Ошибка загрузки в Storage msg {msg.id}")
                        continue

                    shot_at = taken or msg.date
                    shot_iso = shot_at.isoformat() if hasattr(shot_at, "isoformat") else datetime.now(timezone.utc).isoformat()

                    loc_id = None
                    lat = lng = None
                    if coords:
                        lat, lng = coords[0], coords[1]
                        locs = sb.table("locations").select("*").eq("trip_id", trip_id).execute().data or []
                        loc = find_nearest_location(lat, lng, locs)
                        if not loc:
                            gc = reverse_geocode(lat, lng, ua)
                            wiki = search_wikipedia(gc["name"], ua) if gc else None
                            ins = (
                                sb.table("locations")
                                .insert(
                                    {
                                        "trip_id": trip_id,
                                        "name": (gc or {}).get("name") or "Неизвестное место",
                                        "address": (gc or {}).get("address"),
                                        "city": (gc or {}).get("city"),
                                        "country": (gc or {}).get("country"),
                                        "lat": lat,
                                        "lng": lng,
                                        "description": (wiki or {}).get("description"),
                                        "wiki_url": (wiki or {}).get("url"),
                                    }
                                )
                                .execute()
                            )
                            loc = ins.data[0] if ins.data else None
                        loc_id = loc["id"] if loc else None

                    row = {
                        "id": media_id,
                        "trip_id": trip_id,
                        "location_id": loc_id,
                        "user_id": user_id,
                        "telegram_file_id": None,
                        "telegram_file_unique_id": dedup,
                        "file_url": file_url,
                        "thumbnail_url": thumb_url,
                        "shot_at": shot_iso,
                        "lat": lat,
                        "lng": lng,
                        "caption": caption,
                        "media_type": "photo",
                        "pending_download": False,
                    }
                    sb.table("media").insert(row).execute()
                    processed += 1
                    print(f"OK photo msg={msg.id} id={media_id}")
                    continue

                # Видео (импорт локально — грузим в Storage любого размера; лимит 20 МБ только у бота)
                if not (is_doc and msg.media.document):
                    continue
                mime = getattr(msg.media.document, "mime_type", "") or ""
                if not mime.startswith("video/"):
                    continue

                file_size = len(raw)
                media_id = str(uuid.uuid4())

                if args.dry_run:
                    print(f"[dry] video msg={msg.id} size_mb={file_size / (1024 * 1024):.1f} unique={dedup}")
                    processed += 1
                    continue

                ext = "mp4"
                orig_name = None
                for attr in getattr(msg.media.document, "attributes", []) or []:
                    if isinstance(attr, DocumentAttributeFilename) and attr.file_name:
                        orig_name = attr.file_name
                        low = attr.file_name.lower()
                        if low.endswith(".mov"):
                            ext = "mov"
                        break

                vpath = f"trips/{trip_id}/videos/{media_id}.{ext}"
                vurl = upload_storage(sb, vpath, raw, mime or "video/mp4")

                # 413: лимит размера в Supabase Storage — полностью пропускаем (без БД и без локального файла)
                if vurl is None:
                    print(
                        f"Пропуск video msg={msg.id} — лимит Storage (413), ~{file_size / (1024 * 1024):.1f} MB. "
                        f"Поднимите лимит в Supabase или импортируйте вручную."
                    )
                    continue

                coords, taken = extract_exif_exifread(raw)
                shot_at = taken or msg.date
                shot_iso = shot_at.isoformat() if hasattr(shot_at, "isoformat") else datetime.now(timezone.utc).isoformat()

                lat = lng = None
                loc_id = None
                if coords:
                    lat, lng = coords[0], coords[1]
                    locs = sb.table("locations").select("*").eq("trip_id", trip_id).execute().data or []
                    loc = find_nearest_location(lat, lng, locs)
                    if not loc:
                        gc = reverse_geocode(lat, lng, ua)
                        wiki = search_wikipedia(gc["name"], ua) if gc else None
                        ins = (
                            sb.table("locations")
                            .insert(
                                {
                                    "trip_id": trip_id,
                                    "name": (gc or {}).get("name") or "Неизвестное место",
                                    "address": (gc or {}).get("address"),
                                    "city": (gc or {}).get("city"),
                                    "country": (gc or {}).get("country"),
                                    "lat": lat,
                                    "lng": lng,
                                    "description": (wiki or {}).get("description"),
                                    "wiki_url": (wiki or {}).get("url"),
                                }
                            )
                            .execute()
                        )
                        loc = ins.data[0] if ins.data else None
                    loc_id = loc["id"] if loc else None

                sb.table("media").insert(
                    {
                        "id": media_id,
                        "trip_id": trip_id,
                        "location_id": loc_id,
                        "user_id": user_id,
                        "telegram_file_id": None,
                        "telegram_file_unique_id": dedup,
                        "file_url": vurl,
                        "thumbnail_url": None,
                        "shot_at": shot_iso,
                        "lat": lat,
                        "lng": lng,
                        "caption": caption,
                        "pending_download": False,
                        "file_size_bytes": file_size,
                        "original_filename": orig_name,
                        "media_type": "video",
                    }
                ).execute()
                processed += 1
                print(f"OK video msg={msg.id} id={media_id}")

    print(f"Готово. Импортировано медиа: {processed}, пропущено дубликатов: {skipped_dup}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run()))
