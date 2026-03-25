import { NextRequest, NextResponse } from 'next/server';
import { verifyStoryEditAuth } from '@/lib/story-edit-auth';
import { autoAssignTripMediaToLocations, type AutoAssignMode } from '@/lib/media-auto-assign';

/**
 * Привязать фото к заранее созданным локациям по координатам (радиус по умолчанию 1000 м).
 *
 * Body (optional): { radiusMeters?: number, mode?: "unassigned_only" | "all_with_coords" }
 * - unassigned_only — только строки без location_id (по умолчанию)
 * - all_with_coords — пересчитать для всех фото с lat/lng (перезапишет текущую привязку)
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = verifyStoryEditAuth(request);
  if (!auth.ok) return auth.response;

  const tripId = params.id;

  let body: { radiusMeters?: number; mode?: string } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const radiusMeters =
    typeof body.radiusMeters === 'number' && Number.isFinite(body.radiusMeters) && body.radiusMeters > 0
      ? Math.min(body.radiusMeters, 50_000)
      : 1000;

  let mode: AutoAssignMode = 'unassigned_only';
  if (body.mode === 'all_with_coords') mode = 'all_with_coords';

  const result = await autoAssignTripMediaToLocations(tripId, { radiusMeters, mode });
  if (!result) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  return NextResponse.json(result);
}
