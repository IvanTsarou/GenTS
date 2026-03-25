import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyStoryEditAuth } from '@/lib/story-edit-auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; locationId: string } }
) {
  const auth = verifyStoryEditAuth(request);
  if (!auth.ok) return auth.response;

  const { id: tripId, locationId } = params;

  const { data: loc, error: locErr } = await supabase
    .from('locations')
    .select('id')
    .eq('id', locationId)
    .eq('trip_id', tripId)
    .single();

  if (locErr || !loc) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }

  let body: Partial<{ name: string; lat: number; lng: number; address: string | null }>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === 'string') patch.name = body.name.trim();
  if (typeof body.lat === 'number' && Number.isFinite(body.lat)) patch.lat = body.lat;
  if (typeof body.lng === 'number' && Number.isFinite(body.lng)) patch.lng = body.lng;
  if (body.address !== undefined) patch.address = body.address;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: row, error } = await supabase.from('locations').update(patch).eq('id', locationId).select().single();

  if (error) {
    console.error('locations PATCH:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }

  return NextResponse.json({ location: row });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; locationId: string } }
) {
  const auth = verifyStoryEditAuth(_request);
  if (!auth.ok) return auth.response;

  const { id: tripId, locationId } = params;

  const { error } = await supabase.from('locations').delete().eq('id', locationId).eq('trip_id', tripId);

  if (error) {
    console.error('locations DELETE:', error);
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
