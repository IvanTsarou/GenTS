import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { StructuredTrip, StructuredDay, StructuredLocation } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tripId = params.id;

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  const { data: media } = await supabase
    .from('media')
    .select(`
      *,
      user:users(name, username)
    `)
    .eq('trip_id', tripId)
    .order('shot_at', { ascending: true });

  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      *,
      user:users(name, username)
    `)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('trip_id', tripId);

  const locationsMap = new Map(locations?.map((l) => [l.id, l]) || []);

  const dayMap = new Map<string, { photos: typeof media; reviews: typeof reviews }>();

  media?.forEach((m) => {
    const date = m.shot_at
      ? new Date(m.shot_at).toISOString().split('T')[0]
      : new Date(m.created_at).toISOString().split('T')[0];

    if (!dayMap.has(date)) {
      dayMap.set(date, { photos: [], reviews: [] });
    }
    dayMap.get(date)!.photos!.push(m);
  });

  reviews?.forEach((r) => {
    const date = r.day_date || new Date(r.created_at).toISOString().split('T')[0];

    if (!dayMap.has(date)) {
      dayMap.set(date, { photos: [], reviews: [] });
    }
    dayMap.get(date)!.reviews!.push(r);
  });

  const sortedDates = Array.from(dayMap.keys()).sort();

  const days: StructuredDay[] = sortedDates.map((date, index) => {
    const dayData = dayMap.get(date)!;

    const locationMap = new Map<string, StructuredLocation>();

    dayData.photos?.forEach((photo) => {
      const locationId = photo.location_id || 'unassigned';
      const location = photo.location_id ? locationsMap.get(photo.location_id) : null;

      if (!locationMap.has(locationId)) {
        locationMap.set(locationId, {
          location: {
            id: locationId,
            name: location?.name || 'Без локации',
            description: location?.description || null,
            address: location?.address || null,
            city: location?.city || null,
            country: location?.country || null,
          },
          photos: [],
          reviews: [],
        });
      }

      const user = photo.user as { name: string; username: string } | null;

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

      if (!locationMap.has(locationId)) {
        locationMap.set(locationId, {
          location: {
            id: locationId,
            name: location?.name || 'Без локации',
            description: location?.description || null,
            address: location?.address || null,
            city: location?.city || null,
            country: location?.country || null,
          },
          photos: [],
          reviews: [],
        });
      }

      const user = review.user as { name: string; username: string } | null;

      locationMap.get(locationId)!.reviews.push({
        id: review.id,
        text: review.text,
        format: review.format,
        author: user?.name || user?.username || 'Unknown',
        created_at: review.created_at,
      });
    });

    return {
      date,
      day_number: index + 1,
      locations: Array.from(locationMap.values()),
    };
  });

  const result: StructuredTrip = {
    trip: {
      id: trip.id,
      name: trip.name,
      status: trip.status,
      created_at: trip.created_at,
    },
    days,
  };

  return NextResponse.json(result);
}
