import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const noStoreJson = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });

/**
 * Список медиа поездки (для курации: без локации или все).
 * GET без авторизации — только чтение публичных URL из БД.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tripId = params.id;

  const { data: trip, error: tripError } = await supabase.from('trips').select('id').eq('id', tripId).single();
  if (tripError || !trip) {
    return noStoreJson({ error: 'Trip not found' }, 404);
  }

  const unassignedOnly = request.nextUrl.searchParams.get('unassigned') === '1';
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 5000, 10000);

  let q = supabase
    .from('media')
    .select(
      `
      id,
      trip_id,
      location_id,
      file_url,
      thumbnail_url,
      shot_at,
      created_at,
      lat,
      lng,
      caption
    `
    )
    .eq('trip_id', tripId)
    .order('shot_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .limit(limit);

  if (unassignedOnly) {
    q = q.is('location_id', null);
  }

  const { data: media, error } = await q;

  if (error) {
    console.error('media GET:', error);
    return noStoreJson({ error: 'Failed to fetch media' }, 500);
  }

  return noStoreJson({ media: media ?? [] });
}
