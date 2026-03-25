import { supabase } from '@/lib/supabase';
import { findNearestLocationWithinRadius } from '@/lib/clustering';
import type { Location } from '@/lib/supabase';

export type AutoAssignMode = 'unassigned_only' | 'all_with_coords';

export type AutoAssignResult = {
  examined: number;
  assigned: number;
  skippedNoCoords: number;
  skippedNoMatch: number;
  radiusMeters: number;
  mode: AutoAssignMode;
};

const DEFAULT_RADIUS = 1000;

/**
 * Для каждого фото с lat/lng ищет ближайшую локацию поездки в пределах radiusMeters.
 */
export async function autoAssignTripMediaToLocations(
  tripId: string,
  options: { radiusMeters?: number; mode?: AutoAssignMode }
): Promise<AutoAssignResult | null> {
  const radiusMeters = options.radiusMeters ?? DEFAULT_RADIUS;
  const mode = options.mode ?? 'unassigned_only';

  const { data: trip, error: tripErr } = await supabase.from('trips').select('id').eq('id', tripId).single();
  if (tripErr || !trip) return null;

  const { data: locRows, error: locErr } = await supabase
    .from('locations')
    .select('*')
    .eq('trip_id', tripId);

  if (locErr || !locRows?.length) {
    return {
      examined: 0,
      assigned: 0,
      skippedNoCoords: 0,
      skippedNoMatch: 0,
      radiusMeters,
      mode,
    };
  }

  const locations = locRows as Location[];

  let query = supabase.from('media').select('id, lat, lng, location_id').eq('trip_id', tripId);
  if (mode === 'unassigned_only') {
    query = query.is('location_id', null);
  }

  const { data: mediaRows, error: mediaErr } = await query;

  if (mediaErr || !mediaRows?.length) {
    return {
      examined: 0,
      assigned: 0,
      skippedNoCoords: 0,
      skippedNoMatch: 0,
      radiusMeters,
      mode,
    };
  }

  let assigned = 0;
  let skippedNoCoords = 0;
  let skippedNoMatch = 0;

  for (const row of mediaRows) {
    const lat = row.lat;
    const lng = row.lng;
    if (lat == null || lng == null || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      skippedNoCoords++;
      continue;
    }

    const nearest = findNearestLocationWithinRadius(
      { lat: Number(lat), lng: Number(lng) },
      locations,
      radiusMeters
    );

    if (!nearest) {
      skippedNoMatch++;
      continue;
    }

    const { error: upErr } = await supabase
      .from('media')
      .update({ location_id: nearest.id })
      .eq('id', row.id)
      .eq('trip_id', tripId);

    if (!upErr) {
      assigned++;
    }
  }

  return {
    examined: mediaRows.length,
    assigned,
    skippedNoCoords,
    skippedNoMatch,
    radiusMeters,
    mode,
  };
}
