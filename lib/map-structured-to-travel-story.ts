import type { StructuredTrip } from '@/lib/types';
import type { TravelStory, TravelDay, Location, MediaItem, Comment, Transport, TransportType } from '@/lib/types/travel-story';

/** Fallback cover when trip has no photos yet — Gulf / desert mood */
const PLACEHOLDER_COVER =
  'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&q=80';

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function inferTransport(
  from: { lat: number; lng: number } | null,
  to: { lat: number; lng: number } | null
): Transport | undefined {
  if (!from || !to) return undefined;
  const km = haversineKm(from, to);
  if (km < 0.05) return undefined;
  let type: TransportType;
  if (km < 1.5) type = 'walk';
  else if (km < 30) type = 'car';
  else if (km < 400) type = 'train';
  else type = 'plane';
  const distance = km < 1 ? `${Math.round(km * 1000)} м` : `${km < 10 ? km.toFixed(1) : Math.round(km)} км`;
  return {
    type,
    distance,
    details: 'По координатам (приблизительно)',
  };
}

function coordsFromStructured(loc: StructuredTrip['days'][0]['locations'][0]): { lat: number; lng: number } | null {
  const { lat, lng } = loc.location;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  return null;
}

function structuredPhotoToMedia(p: StructuredTrip['days'][0]['locations'][0]['photos'][0], order: number): MediaItem {
  const url = p.url || p.thumbnail_url || PLACEHOLDER_COVER;
  return {
    id: p.id,
    type: 'photo',
    url,
    thumbnailUrl: p.thumbnail_url || undefined,
    caption: p.caption || undefined,
    timestamp: p.shot_at || new Date().toISOString(),
    order,
  };
}

function structuredReviewToComment(r: StructuredTrip['days'][0]['locations'][0]['reviews'][0]): Comment {
  return {
    id: r.id,
    text: r.text || (r.format === 'audio' ? 'Голосовое сообщение' : ''),
    author: r.author || undefined,
    timestamp: r.created_at,
  };
}

function structuredReviewToMediaIfAudio(
  r: StructuredTrip['days'][0]['locations'][0]['reviews'][0],
  order: number
): MediaItem | null {
  if (r.format !== 'audio' || !r.audio_url) return null;
  return {
    id: `review-audio-${r.id}`,
    type: 'audio',
    url: r.audio_url,
    caption: r.text || undefined,
    timestamp: r.created_at,
    order,
  };
}

function structuredLocationToLocation(
  sl: StructuredTrip['days'][0]['locations'][0],
  prevCoords: { lat: number; lng: number } | null,
  /** Уникальный id для «без локации» в этот день (иначе findLocation всегда бьёт в первый день) */
  dayDate: string
): Location {
  const c = coordsFromStructured(sl);
  const coordinates = c || { lat: 0, lng: 0 };

  const locationId =
    sl.location.id === 'unassigned' ? `unassigned__${dayDate}` : sl.location.id;

  const media: MediaItem[] = [];
  let order = 0;
  sl.photos.forEach((p) => {
    media.push(structuredPhotoToMedia(p, order++));
  });
  sl.reviews.forEach((r) => {
    const audio = structuredReviewToMediaIfAudio(r, order++);
    if (audio) media.push(audio);
  });

  const comments: Comment[] = sl.reviews
    .filter((r) => r.format === 'text' || (r.text && r.text.trim().length > 0))
    .map(structuredReviewToComment);

  const transportFrom = prevCoords && c ? inferTransport(prevCoords, c) : undefined;

  const wiki = sl.location.wiki_url;

  return {
    id: locationId,
    name: sl.location.name || 'Локация',
    description: sl.location.description || '',
    coordinates,
    address: sl.location.address || undefined,
    transportFrom,
    media,
    comments,
    sourceDescription: wiki ? 'Wikipedia / внешние источники' : undefined,
    sourceUrl: wiki || undefined,
  };
}

/**
 * Maps API structured trip → TravelStory for the scrapbook UI.
 */
export function structuredTripToTravelStory(structured: StructuredTrip, updatedAt?: string): TravelStory {
  const { trip, days: structuredDays } = structured;

  let prevCoords: { lat: number; lng: number } | null = null;

  const days: TravelDay[] = structuredDays.map((d) => {
    const locations: Location[] = d.locations.map((sl) => {
      const loc = structuredLocationToLocation(sl, prevCoords, d.date);
      const c = coordsFromStructured(sl);
      if (c) prevCoords = c;
      return loc;
    });

    return {
      id: `day-${d.date}`,
      date: d.date,
      dayNumber: d.day_number,
      locations,
    };
  });

  const allCountries = new Set<string>();
  let locCount = 0;
  for (const d of structuredDays) {
    for (const sl of d.locations) {
      if (sl.location.id !== 'unassigned') locCount++;
      const country = sl.location.country;
      if (country) allCountries.add(country);
    }
  }

  const dates = structuredDays.map((d) => d.date).sort();
  const startDate = dates[0] || new Date(trip.created_at).toISOString().split('T')[0];
  const endDate = dates[dates.length - 1] || startDate;

  let coverImage = PLACEHOLDER_COVER;
  outer: for (const d of structuredDays) {
    for (const sl of d.locations) {
      for (const p of sl.photos) {
        if (p.url || p.thumbnail_url) {
          coverImage = p.url || p.thumbnail_url || coverImage;
          break outer;
        }
      }
    }
  }

  const now = new Date().toISOString();

  return {
    id: trip.id,
    title: trip.name,
    coverImage,
    startDate,
    endDate,
    countries: Array.from(allCountries),
    totalLocations: locCount,
    days,
    createdAt: trip.created_at,
    updatedAt: updatedAt || now,
  };
}
