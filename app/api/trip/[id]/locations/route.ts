import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tripId = params.id;

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  const { data: locations, error } = await supabase
    .from('locations')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }

  const locationsWithCounts = await Promise.all(
    (locations || []).map(async (location) => {
      const { count: photosCount } = await supabase
        .from('media')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', location.id);

      const { count: reviewsCount } = await supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', location.id);

      return {
        ...location,
        photos_count: photosCount || 0,
        reviews_count: reviewsCount || 0,
      };
    })
  );

  return NextResponse.json({ locations: locationsWithCounts });
}
