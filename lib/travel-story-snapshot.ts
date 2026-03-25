import type { TravelStory } from '@/lib/types/travel-story';

/** Minimal runtime check before persisting snapshot JSON */
export function isValidTravelStoryPayload(body: unknown, tripId: string): body is TravelStory {
  if (!body || typeof body !== 'object') return false;
  const o = body as Record<string, unknown>;
  if (o.id !== tripId) return false;
  if (typeof o.title !== 'string') return false;
  if (!Array.isArray(o.days)) return false;
  return true;
}
