export type Coordinates = {
  lat: number;
  lng: number;
};

export type ExifData = {
  dateTaken: Date | null;
  coordinates: Coordinates | null;
};

export type GeocodingResult = {
  name: string;
  address: string;
  city: string;
  country: string;
};

export type WikipediaResult = {
  title: string;
  description: string;
  url: string;
};

export type PlacesResult = {
  name: string;
  placeType: string;
  rating: number | null;
};

export type StructuredDay = {
  date: string;
  day_number: number;
  locations: StructuredLocation[];
};

export type StructuredLocation = {
  location: {
    id: string;
    name: string | null;
    description: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
  };
  photos: StructuredPhoto[];
  reviews: StructuredReview[];
};

export type StructuredPhoto = {
  id: string;
  url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  shot_at: string | null;
  author: string | null;
};

export type StructuredReview = {
  id: string;
  text: string | null;
  format: 'text' | 'audio';
  author: string | null;
  created_at: string;
};

export type StructuredTrip = {
  trip: {
    id: string;
    name: string;
    status: string;
    created_at: string;
  };
  days: StructuredDay[];
};

export type PendingAction = {
  type: 'awaiting_location' | 'awaiting_date';
  mediaId?: string;
  messageId?: number;
};

export type UserState = {
  pendingAction?: PendingAction;
  lastLocationId?: string;
  lastPhotoAt?: Date;
};
