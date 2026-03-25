import { NextRequest, NextResponse } from 'next/server';
import { buildStructuredTrip } from '@/lib/structured-trip-builder';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tripId = params.id;

  const result = await buildStructuredTrip(tripId);

  if (!result) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  return NextResponse.json(result);
}
