import { supabase } from '@/lib/supabase';
import type { StructuredTrip, StructuredDay, StructuredLocation } from '@/lib/types';

type MediaRow = {
  id: string;
  location_id: string | null;
  file_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  shot_at: string | null;
  created_at: string;
  user: { name: string; username: string } | null;
};

type ReviewRow = {
  id: string;
  location_id: string | null;
  text: string | null;
  format: 'text' | 'audio';
  audio_url: string | null;
  day_date: string | null;
  created_at: string;
  user: { name: string; username: string } | null;
};

type LocationRow = {
  id: string;
  name: string | null;
  address: string | null;
  country: string | null;
  city: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  wiki_url: string | null;
};

/** YYYY-MM-DD для группировки по дню; битые даты не роняют сборку истории */
function calendarDayFromTimestamps(shotAt: string | null, createdAt: string): string {
  const primary = shotAt ? new Date(shotAt) : new Date(createdAt);
  if (!Number.isNaN(primary.getTime())) {
    return primary.toISOString().split('T')[0];
  }
  const fallback = new Date(createdAt);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toISOString().split('T')[0];
  }
  return '1970-01-01';
}

/**
 * Builds the structured trip payload from Supabase (same shape as GET /api/trip/:id/structured).
 */
export async function buildStructuredTrip(tripId: string): Promise<StructuredTrip | null> {
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    return null;
  }

  const { data: media } = await supabase
    .from('media')
    .select(
      `
      *,
      user:users(name, username)
    `
    )
    .eq('trip_id', tripId)
    .order('shot_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .limit(5000);

  const { data: reviews } = await supabase
    .from('reviews')
    .select(
      `
      *,
      user:users(name, username)
    `
    )
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  const { data: locations } = await supabase.from('locations').select('*').eq('trip_id', tripId);

  const locationsMap = new Map<string, LocationRow>(
    (locations as LocationRow[] | null)?.map((l) => [l.id, l]) || []
  );

  const dayMap = new Map<string, { photos: MediaRow[]; reviews: ReviewRow[] }>();

  (media as MediaRow[] | null)?.forEach((m) => {
    const date = calendarDayFromTimestamps(m.shot_at, m.created_at);

    if (!dayMap.has(date)) {
      dayMap.set(date, { photos: [], reviews: [] });
    }
    dayMap.get(date)!.photos.push(m);
  });

  (reviews as ReviewRow[] | null)?.forEach((r) => {
    const date = r.day_date?.trim()
      ? r.day_date.trim().slice(0, 10)
      : calendarDayFromTimestamps(null, r.created_at);

    if (!dayMap.has(date)) {
      dayMap.set(date, { photos: [], reviews: [] });
    }
    dayMap.get(date)!.reviews.push(r);
  });

  const sortedDates = Array.from(dayMap.keys()).sort();

  const days: StructuredDay[] = sortedDates.map((date, index) => {
    const dayData = dayMap.get(date)!;

    const locationMap = new Map<string, StructuredLocation>();

    const ensureLoc = (locationId: string, location: LocationRow | null | undefined) => {
      if (!locationMap.has(locationId)) {
        locationMap.set(locationId, {
          location: {
            id: locationId,
            name: location?.name || 'Без локации',
            description: location?.description || null,
            address: location?.address || null,
            city: location?.city || null,
            country: location?.country || null,
            lat: location?.lat ?? null,
            lng: location?.lng ?? null,
            wiki_url: location?.wiki_url ?? null,
          },
          photos: [],
          reviews: [],
        });
      }
    };

    dayData.photos?.forEach((photo) => {
      const locationId = photo.location_id || 'unassigned';
      const location = photo.location_id ? locationsMap.get(photo.location_id) : null;
      ensureLoc(locationId, location || undefined);

      const user = photo.user;

      locationMap.get(locationId)!.photos.push({
        id: photo.id,
        url: photo.file_url,
        thumbnail_url: photo.thumbnail_url,
        caption: photo.caption,
        shot_at: photo.shot_at,
        author: user?.name || user?.username || 'Unknown',
      });
    });

    dayData.reviews?.forEach((review) => {
      const locationId = review.location_id || 'unassigned';
      const location = review.location_id ? locationsMap.get(review.location_id) : null;
      ensureLoc(locationId, location || undefined);

      const user = review.user;

      locationMap.get(locationId)!.reviews.push({
        id: review.id,
        text: review.text,
        format: review.format,
        author: user?.name || user?.username || 'Unknown',
        created_at: review.created_at,
        audio_url: review.audio_url,
      });
    });

    return {
      date,
      day_number: index + 1,
      locations: Array.from(locationMap.values()),
    };
  });

  return {
    trip: {
      id: trip.id,
      name: trip.name,
      status: trip.status,
      created_at: trip.created_at,
    },
    days,
  };
}
