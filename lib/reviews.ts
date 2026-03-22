import type { Context } from 'grammy';
import type { Message } from '@grammyjs/types';
import type { User } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export type ReviewScope = 'location' | 'day' | 'trip';

const LAST_PHOTO_WINDOW_HOURS = 2;

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/mov', 'video/mpeg', 'video/x-m4v'];

/** Strip `/command` and optional @BotName from message text. */
export function extractCommandText(messageText: string | undefined, command: string): string {
  if (!messageText) return '';
  return messageText.replace(new RegExp(`^/${command}(@\\w+)?\\s*`, 'i'), '').trim();
}

function getTelegramFileIdFromMediaMessage(reply: Message): string | null {
  if ('photo' in reply && reply.photo?.length) {
    return reply.photo[reply.photo.length - 1].file_id;
  }
  if ('video' in reply && reply.video) {
    return reply.video.file_id;
  }
  if ('video_note' in reply && reply.video_note) {
    return reply.video_note.file_id;
  }
  if ('animation' in reply && reply.animation) {
    return reply.animation.file_id;
  }
  if ('document' in reply && reply.document) {
    const d = reply.document;
    const mime = d.mime_type?.toLowerCase() || '';
    const name = d.file_name?.toLowerCase() || '';
    const isImage =
      IMAGE_MIME_TYPES.includes(mime) ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.png') ||
      name.endsWith('.heic') ||
      name.endsWith('.heif');
    const isVideo =
      VIDEO_MIME_TYPES.includes(mime) ||
      name.endsWith('.mp4') ||
      name.endsWith('.mov') ||
      name.endsWith('.m4v');
    if (isImage || isVideo) return d.file_id;
  }
  return null;
}

/** Контекст медиа в БД по reply (фото/видео/документ как фото или видео). */
export async function getMediaContextFromReply(
  replyToMessage: Message | undefined,
  tripId: string
): Promise<{ locationId: string | null; dayDate: string } | null> {
  if (!replyToMessage) return null;
  const fileId = getTelegramFileIdFromMediaMessage(replyToMessage);
  if (!fileId) return null;

  const { data: media } = await supabase
    .from('media')
    .select('location_id, shot_at, created_at')
    .eq('trip_id', tripId)
    .eq('telegram_file_id', fileId)
    .maybeSingle();

  if (!media) return null;

  const dayDate = media.shot_at
    ? new Date(media.shot_at).toISOString().split('T')[0]
    : new Date(media.created_at).toISOString().split('T')[0];

  return {
    locationId: media.location_id,
    dayDate,
  };
}

export async function insertTextReview(params: {
  tripId: string;
  userId: string;
  text: string;
  scope: ReviewScope;
  locationId?: string | null;
  dayDate?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('reviews').insert({
    id: uuidv4(),
    trip_id: params.tripId,
    location_id: params.locationId ?? null,
    user_id: params.userId,
    text: params.text,
    format: 'text',
    day_date: params.dayDate ?? null,
    review_scope: params.scope,
  });
  if (error) throw error;
}

/** Подпись к фото/видео — отдельная запись отзыва (scope location). */
export async function insertCaptionReview(
  caption: string | null | undefined,
  params: {
    tripId: string;
    userId: string;
    locationId: string | null;
    shotAt: Date | string | null;
  }
): Promise<void> {
  const t = caption?.trim();
  if (!t) return;
  const dayDate = params.shotAt
    ? new Date(params.shotAt).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  await insertTextReview({
    tripId: params.tripId,
    userId: params.userId,
    text: t,
    scope: 'location',
    locationId: params.locationId,
    dayDate,
  });
}

/** Голос: reply к медиа или «окно» после последнего фото с локацией. */
export async function getLocationIdForVoice(
  ctx: Context,
  user: User,
  tripId: string
): Promise<string | null> {
  const fromReply = await getMediaContextFromReply(ctx.message?.reply_to_message, tripId);
  if (fromReply?.locationId) return fromReply.locationId;

  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - LAST_PHOTO_WINDOW_HOURS);

  const { data: recentMedia } = await supabase
    .from('media')
    .select('location_id')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .not('location_id', 'is', null)
    .gte('created_at', windowStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  return recentMedia?.[0]?.location_id ?? null;
}
