import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tripId = params.id;

  const { data: story, error } = await supabase
    .from('stories')
    .select('*')
    .eq('trip_id', tripId)
    .single();

  if (error || !story) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: story.id,
    trip_id: story.trip_id,
    content: story.content,
    status: story.status,
    created_at: story.created_at,
    updated_at: story.updated_at,
  });
}
