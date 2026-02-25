import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseServiceKey);
  }

  return supabaseInstance;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as unknown as Record<string, unknown>)[prop as string];
  },
});

export type User = {
  id: string;
  telegram_id: number;
  name: string | null;
  username: string | null;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
};

export type Trip = {
  id: string;
  name: string;
  created_by: string | null;
  telegram_group_id: number | null;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
};

export type Location = {
  id: string;
  trip_id: string;
  name: string | null;
  address: string | null;
  country: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  wiki_url: string | null;
  place_type: string | null;
  created_at: string;
};

export type Media = {
  id: string;
  trip_id: string;
  location_id: string | null;
  user_id: string;
  telegram_file_id: string | null;
  file_url: string | null;
  thumbnail_url: string | null;
  shot_at: string | null;
  lat: number | null;
  lng: number | null;
  caption: string | null;
  created_at: string;
};

export type Review = {
  id: string;
  trip_id: string;
  location_id: string | null;
  user_id: string;
  text: string | null;
  format: 'text' | 'audio';
  audio_url: string | null;
  day_date: string | null;
  created_at: string;
};

export type BotLog = {
  id: string;
  telegram_user_id: number | null;
  chat_id: number | null;
  message_type: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export type Story = {
  id: string;
  trip_id: string;
  content: string | null;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
};
