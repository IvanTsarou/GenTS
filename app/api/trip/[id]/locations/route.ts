import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyStoryEditAuth } from '@/lib/story-edit-auth';

export const dynamic = 'force-dynamic';

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tripId = params.id;

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    return noStoreJson({ error: 'Trip not found' }, 404);
  }

  const { data: locations, error } = await supabase
    .from('locations')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (error) {
    return noStoreJson({ error: 'Failed to fetch locations' }, 500);
  }

  const locationsWithCounts = await Promise.all(
    (locations || []).map(async (location) => {
      const { count: photosCount } = await supabase
        .from('media')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', location.id);

      const { count: reviewsCount } = await supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', location.id);

      return {
        ...location,
        photos_count: photosCount || 0,
        reviews_count: reviewsCount || 0,
      };
    })
  );

  return noStoreJson({ locations: locationsWithCounts });
}

/** Создать локацию вручную (название + координаты) для курации поездки. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = verifyStoryEditAuth(request);
  if (!auth.ok) return auth.response;

  const tripId = params.id;

  const { data: trip, error: tripError } = await supabase.from('trips').select('id').eq('id', tripId).single();
  if (tripError || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  let body: { name?: string; lat?: number; lng?: number; address?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const lat = typeof body.lat === 'number' ? body.lat : Number(body.lat);
  const lng = typeof body.lng === 'number' ? body.lng : Number(body.lng);

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat and lng must be finite numbers' }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from('locations')
    .insert({
      trip_id: tripId,
      name,
      lat,
      lng,
      address: body.address ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('locations POST:', error);
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }

  return NextResponse.json({ location: row });
}
