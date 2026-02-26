-- Add pending_download flag for large files
-- Run this in Supabase SQL Editor

ALTER TABLE media ADD COLUMN IF NOT EXISTS pending_download BOOLEAN DEFAULT FALSE;
ALTER TABLE media ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE media ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);
ALTER TABLE media ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'photo' CHECK (media_type IN ('photo', 'video'));

CREATE INDEX idx_media_pending_download ON media(pending_download) WHERE pending_download = true;
