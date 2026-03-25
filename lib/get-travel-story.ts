import { supabase } from '@/lib/supabase';
import { buildStructuredTrip } from '@/lib/structured-trip-builder';
import { structuredTripToTravelStory } from '@/lib/map-structured-to-travel-story';
import { isValidTravelStoryPayload } from '@/lib/travel-story-snapshot';
import type { TravelStory } from '@/lib/types/travel-story';

type TripRow = {
  id: string;
  story_snapshot: unknown;
  story_snapshot_updated_at: string | null;
};

/**
 * Shared loader for GET /api/trip/:id/travel-story and the story page (RSC).
 */
export async function getTravelStoryByTripId(tripId: string): Promise<TravelStory | null> {
  const { data: trip, error } = await supabase
    .from('trips')
    .select('id, story_snapshot, story_snapshot_updated_at')
    .eq('id', tripId)
    .single();

  if (error || !trip) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[getTravelStoryByTripId]', tripId, error?.message ?? 'no row');
    }
    return null;
  }

  const row = trip as TripRow;

  if (row.story_snapshot && isValidTravelStoryPayload(row.story_snapshot, tripId)) {
    const snap = row.story_snapshot as TravelStory;
    if (row.story_snapshot_updated_at) {
      snap.updatedAt = row.story_snapshot_updated_at;
    }
    return snap;
  }

  const structured = await buildStructuredTrip(tripId);
  if (!structured) {
    return null;
  }

  return structuredTripToTravelStory(structured);
}
