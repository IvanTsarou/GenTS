export type TransportType =
  | 'plane'
  | 'car'
  | 'train'
  | 'walk'
  | 'ship'
  | 'bike'
  | 'bus'
  | 'motorcycle'
  | 'cable_car'
  | 'taxi'
  | 'metro'
  | 'tram';

export interface TravelStory {
  id: string;
  title: string;
  coverImage: string;
  startDate: string;
  endDate: string;
  countries: string[];
  totalLocations: number;
  days: TravelDay[];
  createdAt: string;
  updatedAt: string;
}

export interface TravelDay {
  id: string;
  date: string;
  dayNumber: number;
  locations: Location[];
}

export interface Location {
  id: string;
  name: string;
  description: string;
  coordinates: { lat: number; lng: number };
  address?: string;
  arrivalTime?: string;
  departureTime?: string;
  transportFrom?: Transport;
  media: MediaItem[];
  comments: Comment[];
  sourceDescription?: string;
  sourceUrl?: string;
}

export interface Transport {
  type: TransportType;
  duration?: string;
  distance?: string;
  details?: string;
}

export interface MediaItem {
  id: string;
  type: 'photo' | 'video' | 'audio' | 'video_note';
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  timestamp: string;
  order: number;
}

export interface Comment {
  id: string;
  text: string;
  author?: string;
  timestamp: string;
}

export interface EditableField {
  field: string;
  value: string | number;
  locationId?: string;
  dayId?: string;
  mediaId?: string;
}
