import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tripId = params.id;

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  const structuredUrl = `${process.env.APP_URL || ''}/api/trip/${tripId}/structured`;

  try {
    const structuredResponse = await fetch(structuredUrl);
    const structuredData = await structuredResponse.json();

    console.log('=== TRIP STRUCTURED DATA ===');
    console.log(JSON.stringify(structuredData, null, 2));
    console.log('=== END STRUCTURED DATA ===');

    const { data: existingStory } = await supabase
      .from('stories')
      .select('id')
      .eq('trip_id', tripId)
      .single();

    if (existingStory) {
      await supabase
        .from('stories')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', existingStory.id);
    } else {
      await supabase.from('stories').insert({
        trip_id: tripId,
        status: 'pending',
      });
    }

    return NextResponse.json({
      status: 'pending',
      message: 'Story generation queued. Data logged to console.',
    });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: 'Failed to start generation' }, { status: 500 });
  }
}

// TODO: Implement actual story generation using OpenAI GPT-4o
// This function will be called with structured trip data
async function generateStory(_structuredData: unknown): Promise<string> {
  // TODO: Use Cursor AI integration or OpenAI API to generate story
  // The structured data contains:
  // - trip info (name, dates)
  // - days array with locations
  // - each location has photos and reviews
  //
  // Generate a travel story narrative based on this data
  return '';
}
