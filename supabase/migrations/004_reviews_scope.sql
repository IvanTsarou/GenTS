-- Semantic bucket for text reviews: location / day / trip (caption & reply use location)
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS review_scope VARCHAR(20)
  CHECK (review_scope IS NULL OR review_scope IN ('location', 'day', 'trip'));

COMMENT ON COLUMN reviews.review_scope IS 'location: привязка к месту; day: день; trip: всё путешествие';
