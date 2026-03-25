import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getTravelStoryByTripId } from '@/lib/get-travel-story';
import { isValidTravelStoryPayload } from '@/lib/travel-story-snapshot';
import { buildStructuredTrip } from '@/lib/structured-trip-builder';
import { structuredTripToTravelStory } from '@/lib/map-structured-to-travel-story';
import type { TravelStory } from '@/lib/types/travel-story';

/**
 * Travel Story for the scrapbook UI: either edited snapshot or derived from DB.
 *
 * ?live=1  — always rebuild from DB (ignores snapshot, does not overwrite it).
 *            Use after bulk media import to see updated data before re-bootstrapping.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tripId = params.id;
  const live = request.nextUrl.searchParams.get('live') === '1';

  if (live) {
    const structured = await buildStructuredTrip(tripId);
    if (!structured) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }
    return NextResponse.json(structuredTripToTravelStory(structured));
  }

  const story = await getTravelStoryByTripId(tripId);
  if (!story) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  return NextResponse.json(story);
}

/**
 * Save full TravelStory JSON (after user edits in the UI).
 * Secured with STORY_EDIT_TOKEN (same-origin / server use). Add OAuth later.
 */
export async function PATCH(
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

  /**
   * Production: обязателен верный Bearer.
   * Development: без заголовка можно (удобно без NEXT_PUBLIC_STORY_EDIT_TOKEN);
   * если заголовок передан — он должен совпасть с токеном.
   */
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isValidTravelStoryPayload(body, tripId)) {
    return NextResponse.json(
      { error: 'Body must be a TravelStory with id matching trip' },
      { status: 400 }
    );
  }

  const story = body as TravelStory;
  const updatedAt = new Date().toISOString();
  const toStore = { ...story, updatedAt };

  const { error } = await supabase
    .from('trips')
    .update({
      story_snapshot: toStore as unknown as Record<string, unknown>,
      story_snapshot_updated_at: updatedAt,
    })
    .eq('id', tripId);

  if (error) {
    console.error('travel-story PATCH:', error);
    return NextResponse.json({ error: 'Failed to save story' }, { status: 500 });
  }

  return NextResponse.json(toStore);
}
