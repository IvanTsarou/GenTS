import { supabase } from './supabase';

const BUCKET_NAME = 'media';

export async function uploadFile(
  buffer: Buffer,
  path: string,
  contentType: string = 'image/jpeg'
): Promise<string | null> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Storage upload error:', error);
    return null;
  }
}

export async function uploadPhoto(
  buffer: Buffer,
  tripId: string,
  mediaId: string
): Promise<{ fileUrl: string; thumbnailUrl: string } | null> {
  const { processImage } = await import('./thumbnails');
  const { original, thumbnail } = await processImage(buffer);

  const originalPath = `trips/${tripId}/photos/${mediaId}.jpg`;
  const thumbnailPath = `trips/${tripId}/thumbnails/${mediaId}.jpg`;

  const [fileUrl, thumbnailUrl] = await Promise.all([
    uploadFile(original, originalPath, 'image/jpeg'),
    uploadFile(thumbnail, thumbnailPath, 'image/jpeg'),
  ]);

  if (!fileUrl || !thumbnailUrl) {
    return null;
  }

  return { fileUrl, thumbnailUrl };
}

export async function uploadAudio(
  buffer: Buffer,
  tripId: string,
  reviewId: string,
  mimeType: string = 'audio/ogg'
): Promise<string | null> {
  const extension = mimeType.includes('ogg') ? 'ogg' : 'mp3';
  const path = `trips/${tripId}/audio/${reviewId}.${extension}`;

  return uploadFile(buffer, path, mimeType);
}
