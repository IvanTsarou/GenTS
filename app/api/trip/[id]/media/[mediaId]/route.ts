import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyStoryEditAuth } from '@/lib/story-edit-auth';
import { removeMediaFilesByUrls } from '@/lib/storage';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; mediaId: string } }
) {
  const auth = verifyStoryEditAuth(request);
  if (!auth.ok) return auth.response;

  const { id: tripId, mediaId } = params;

  const { data: media, error: mErr } = await supabase
    .from('media')
    .select('id, trip_id')
    .eq('id', mediaId)
    .eq('trip_id', tripId)
    .single();

  if (mErr || !media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  let body: { location_id?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!('location_id' in body)) {
    return NextResponse.json({ error: 'location_id required (string UUID or null)' }, { status: 400 });
  }

  const locId = body.location_id;

  if (locId !== null) {
    if (typeof locId !== 'string' || !locId.trim()) {
      return NextResponse.json({ error: 'location_id must be UUID or null' }, { status: 400 });
    }
    const { data: loc, error: lErr } = await supabase
      .from('locations')
      .select('id')
      .eq('id', locId)
      .eq('trip_id', tripId)
      .single();
    if (lErr || !loc) {
      return NextResponse.json({ error: 'Location not in this trip' }, { status: 400 });
    }
  }

  const { data: row, error } = await supabase
    .from('media')
    .update({ location_id: locId })
    .eq('id', mediaId)
    .eq('trip_id', tripId)
    .select()
    .single();

  if (error) {
    console.error('media PATCH:', error);
    return NextResponse.json({ error: 'Failed to update media' }, { status: 500 });
  }

  return NextResponse.json({ media: row });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; mediaId: string } }
) {
  const auth = verifyStoryEditAuth(request);
  if (!auth.ok) return auth.response;

  const { id: tripId, mediaId } = params;

  const { data: row, error: fetchErr } = await supabase
    .from('media')
    .select('id, file_url, thumbnail_url')
    .eq('id', mediaId)
    .eq('trip_id', tripId)
    .single();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  await removeMediaFilesByUrls(row.file_url, row.thumbnail_url);

  const { error: delErr } = await supabase.from('media').delete().eq('id', mediaId).eq('trip_id', tripId);

  if (delErr) {
    console.error('media DELETE:', delErr);
    return NextResponse.json({ error: 'Failed to delete media row' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
