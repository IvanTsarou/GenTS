import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyStoryEditAuth } from '@/lib/story-edit-auth';
import { NIZWA_ITINERARY_LOCATIONS, NIZWA_PRESET_ID } from '@/lib/presets/nizwa-itinerary-locations';

/**
 * Заменяет все локации поездки на пресет (удаляет старые, вставляет новые).
 * У media/reviews location_id сбросится в NULL (ON DELETE SET NULL) — затем заново автопривязка.
 *
 * Body: { "preset": "nizwa-itinerary" }
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = verifyStoryEditAuth(request);
  if (!auth.ok) return auth.response;

  const tripId = params.id;

  const { data: trip, error: tripErr } = await supabase.from('trips').select('id').eq('id', tripId).single();
  if (tripErr || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  let body: { preset?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.preset !== NIZWA_PRESET_ID) {
    return NextResponse.json(
      { error: `Unknown preset. Use "${NIZWA_PRESET_ID}".` },
      { status: 400 }
    );
  }

  const { error: delErr } = await supabase.from('locations').delete().eq('trip_id', tripId);
  if (delErr) {
    console.error('seed-preset delete locations:', delErr);
    return NextResponse.json({ error: 'Failed to clear locations' }, { status: 500 });
  }

  const rows = NIZWA_ITINERARY_LOCATIONS.map((l) => ({
    trip_id: tripId,
    name: l.name,
    lat: l.lat,
    lng: l.lng,
    description: l.description ?? null,
  }));

  const { data: inserted, error: insErr } = await supabase.from('locations').insert(rows).select('id');

  if (insErr) {
    console.error('seed-preset insert:', insErr);
    return NextResponse.json({ error: 'Failed to insert preset locations' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    preset: NIZWA_PRESET_ID,
    inserted: inserted?.length ?? rows.length,
  });
}
