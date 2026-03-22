-- Deduplication for MTProto import (stable file id from Telegram)
ALTER TABLE media ADD COLUMN IF NOT EXISTS telegram_file_unique_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_media_trip_file_unique
  ON media(trip_id, telegram_file_unique_id)
  WHERE telegram_file_unique_id IS NOT NULL;
