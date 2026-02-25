import exifr from 'exifr';
import type { ExifData, Coordinates } from './types';

export async function extractExif(buffer: Buffer): Promise<ExifData> {
  try {
    const exif = await exifr.parse(buffer, {
      pick: ['DateTimeOriginal', 'CreateDate', 'GPSLatitude', 'GPSLongitude'],
      gps: true,
    });

    if (!exif) {
      return { dateTaken: null, coordinates: null };
    }

    let dateTaken: Date | null = null;
    if (exif.DateTimeOriginal) {
      dateTaken = new Date(exif.DateTimeOriginal);
    } else if (exif.CreateDate) {
      dateTaken = new Date(exif.CreateDate);
    }

    let coordinates: Coordinates | null = null;
    if (exif.latitude !== undefined && exif.longitude !== undefined) {
      coordinates = {
        lat: exif.latitude,
        lng: exif.longitude,
      };
    }

    return { dateTaken, coordinates };
  } catch (error) {
    console.error('EXIF extraction error:', error);
    return { dateTaken: null, coordinates: null };
  }
}
