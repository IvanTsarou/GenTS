-- Edited Travel Story UI snapshot (full JSON) for share-ready narrative
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS story_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS story_snapshot_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN trips.story_snapshot IS 'Client-edited TravelStory JSON; overrides computed story when set';
