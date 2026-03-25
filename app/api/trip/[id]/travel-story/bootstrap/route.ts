import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { buildStructuredTrip } from '@/lib/structured-trip-builder';
import { structuredTripToTravelStory } from '@/lib/map-structured-to-travel-story';
import { withSyncedMetrics } from '@/lib/travel-story-metrics';

/**
 * Собирает Travel Story из медиа/локаций в БД и записывает в trips.story_snapshot
 * (как «первая публикация» редактируемой истории).
 *
 * POST …/bootstrap           — только если snapshot ещё пустой
 * POST …/bootstrap?force=1   — перезаписать существующий snapshot
 *
 * Тот же Bearer STORY_EDIT_TOKEN, что и для PATCH travel-story.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tripId = params.id;
  const token = process.env.STORY_EDIT_TOKEN;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && !token) {
    return NextResponse.json(
      { error: 'STORY_EDIT_TOKEN is required in production' },
      { status: 503 }
    );
  }

  if (token && isProd) {
    const auth = request.headers.get('authorization');
    const bearer = auth?.replace(/^Bearer\s+/i, '');
    if (bearer !== token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else if (token && !isProd) {
    const auth = request.headers.get('authorization');
    const bearer = auth?.replace(/^Bearer\s+/i, '');
    if (bearer && bearer !== token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const force = request.nextUrl.searchParams.get('force') === '1';

  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .select('id, story_snapshot')
    .eq('id', tripId)
    .single();

  if (tripErr || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  if (trip.story_snapshot != null && !force) {
    return NextResponse.json(
      {
        error:
          'story_snapshot already exists; open /story/[tripId] or call POST with ?force=1 to overwrite',
      },
      { status: 409 }
    );
  }

  const structured = await buildStructuredTrip(tripId);
  if (!structured) {
    return NextResponse.json({ error: 'Could not build structured trip' }, { status: 404 });
  }

  let story = structuredTripToTravelStory(structured);
  story = withSyncedMetrics(story);
  const updatedAt = new Date().toISOString();
  const toStore = { ...story, updatedAt };

  const { error: upErr } = await supabase
    .from('trips')
    .update({
      story_snapshot: toStore as unknown as Record<string, unknown>,
      story_snapshot_updated_at: updatedAt,
    })
    .eq('id', tripId);

  if (upErr) {
    console.error('travel-story bootstrap:', upErr);
    return NextResponse.json({ error: 'Failed to save snapshot' }, { status: 500 });
  }

  return NextResponse.json(toStore);
}
