-- GenTS Initial Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    name VARCHAR(255),
    username VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);

-- Trips table
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES users(id),
    telegram_group_id BIGINT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_telegram_group_id ON trips(telegram_group_id);

-- Locations table
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    name VARCHAR(255),
    address TEXT,
    country VARCHAR(100),
    city VARCHAR(100),
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    description TEXT,
    wiki_url TEXT,
    place_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_trip_id ON locations(trip_id);
CREATE INDEX idx_locations_coords ON locations(lat, lng);

-- Media table (photos)
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id),
    telegram_file_id VARCHAR(255),
    file_url TEXT,
    thumbnail_url TEXT,
    shot_at TIMESTAMPTZ,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    caption TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_trip_id ON media(trip_id);
CREATE INDEX idx_media_location_id ON media(location_id);
CREATE INDEX idx_media_user_id ON media(user_id);
CREATE INDEX idx_media_shot_at ON media(shot_at);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id),
    text TEXT,
    format VARCHAR(20) DEFAULT 'text' CHECK (format IN ('text', 'audio')),
    audio_url TEXT,
    day_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_trip_id ON reviews(trip_id);
CREATE INDEX idx_reviews_location_id ON reviews(location_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);

-- Bot logs table
CREATE TABLE bot_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_user_id BIGINT,
    chat_id BIGINT,
    message_type VARCHAR(50),
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bot_logs_telegram_user_id ON bot_logs(telegram_user_id);
CREATE INDEX idx_bot_logs_created_at ON bot_logs(created_at);

-- Stories table (for generated stories)
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    content TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stories_trip_id ON stories(trip_id);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Policies for service role (full access)
CREATE POLICY "Service role has full access to users" ON users FOR ALL USING (true);
CREATE POLICY "Service role has full access to trips" ON trips FOR ALL USING (true);
CREATE POLICY "Service role has full access to locations" ON locations FOR ALL USING (true);
CREATE POLICY "Service role has full access to media" ON media FOR ALL USING (true);
CREATE POLICY "Service role has full access to reviews" ON reviews FOR ALL USING (true);
CREATE POLICY "Service role has full access to bot_logs" ON bot_logs FOR ALL USING (true);
CREATE POLICY "Service role has full access to stories" ON stories FOR ALL USING (true);
