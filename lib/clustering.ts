import type { Coordinates } from './types';
import type { Location } from './supabase';

const CLUSTER_RADIUS_METERS = 500;
const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const lat1 = toRadians(point1.lat);
  const lat2 = toRadians(point2.lat);
  const deltaLat = toRadians(point2.lat - point1.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/** Ближайшая локация с координатами в пределах radiusMeters (метры). */
export function findNearestLocationWithinRadius(
  coordinates: Coordinates,
  locations: Location[],
  radiusMeters: number
): Location | null {
  let nearestLocation: Location | null = null;
  let minDistance = Infinity;

  for (const location of locations) {
    if (location.lat === null || location.lng === null) continue;

    const distance = calculateDistance(coordinates, {
      lat: location.lat,
      lng: location.lng,
    });

    if (distance <= radiusMeters && distance < minDistance) {
      minDistance = distance;
      nearestLocation = location;
    }
  }

  return nearestLocation;
}

export function findNearestLocation(
  coordinates: Coordinates,
  locations: Location[]
): Location | null {
  return findNearestLocationWithinRadius(coordinates, locations, CLUSTER_RADIUS_METERS);
}

export function shouldCreateNewLocation(
  coordinates: Coordinates,
  locations: Location[]
): boolean {
  return findNearestLocation(coordinates, locations) === null;
}
