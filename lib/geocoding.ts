import type { Coordinates, GeocodingResult } from './types';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

export async function reverseGeocode(
  coordinates: Coordinates
): Promise<GeocodingResult | null> {
  const userAgent = process.env.NOMINATIM_USER_AGENT || 'gents-travel-bot';

  try {
    const url = new URL('/reverse', NOMINATIM_BASE_URL);
    url.searchParams.set('lat', coordinates.lat.toString());
    url.searchParams.set('lon', coordinates.lng.toString());
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', 'ru,en');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': userAgent,
      },
    });

    if (!response.ok) {
      console.error('Nominatim error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data || data.error) {
      return null;
    }

    const address = data.address || {};

    return {
      name: data.name || data.display_name?.split(',')[0] || 'Unknown',
      address: data.display_name || '',
      city:
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        '',
      country: address.country || '',
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

export async function searchPlace(query: string): Promise<Coordinates | null> {
  const userAgent = process.env.NOMINATIM_USER_AGENT || 'gents-travel-bot';

  try {
    const url = new URL('/search', NOMINATIM_BASE_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': userAgent,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return null;
    }

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch (error) {
    console.error('Place search error:', error);
    return null;
  }
}
