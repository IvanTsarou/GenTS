import type { BotContext } from '../index';
import type { User } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { extractExif } from '@/lib/exif';
import { findNearestLocation } from '@/lib/clustering';
import { reverseGeocode } from '@/lib/geocoding';
import { searchWikipedia } from '@/lib/wikipedia';
import { getActiveTrip } from '../commands';
import { insertCaptionReview } from '@/lib/reviews';
import { v4 as uuidv4 } from 'uuid';

type AuthenticatedContext = BotContext & { user: User };

export async function handleVideo(ctx: BotContext): Promise<void> {
  const user = (ctx as AuthenticatedContext).user;
  if (!user) return;

  const video = ctx.message?.video || ctx.message?.video_note;
  if (!video) return;

  const fileSize = video.file_size || 0;
  const fileSizeMB = fileSize / (1024 * 1024);
  const isLargeFile = fileSizeMB > 20;

  const activeTrip = await getActiveTrip(ctx);
  if (!activeTrip) {
    await ctx.reply(
      '❌ Нет активной поездки.\n\n' +
        'Используйте /tripnew для создания.'
    );
    return;
  }

  const caption = ctx.message?.caption || null;

  if (isLargeFile) {
    try {
      const mediaId = uuidv4();

      await supabase.from('media').insert({
        id: mediaId,
        trip_id: activeTrip.id,
        user_id: user.id,
        telegram_file_id: video.file_id,
        file_url: null,
        thumbnail_url: null,
        shot_at: new Date().toISOString(),
        caption,
        pending_download: true,
        file_size_bytes: fileSize,
        media_type: 'video',
      });

      await insertCaptionReview(caption, {
        tripId: activeTrip.id,
        userId: user.id,
        locationId: null,
        shotAt: new Date(),
      });
    } catch (error) {
      console.error('Large video registration error:', error);
      await ctx.reply('❌ Ошибка регистрации видео. Попробуйте ещё раз.');
    }
    return;
  }

  try {
    const file = await ctx.api.getFile(video.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const mediaId = uuidv4();

    const mimeType = 'mime_type' in video ? video.mime_type || 'video/mp4' : 'video/mp4';
    const extension = mimeType.includes('mp4') ? 'mp4' : 'mov';
    const videoPath = `trips/${activeTrip.id}/videos/${mediaId}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(videoPath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Video upload error:', uploadError);
      await ctx.reply('❌ Ошибка загрузки видео. Попробуйте ещё раз.');
      return;
    }

    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(videoPath);

    const videoUrl = urlData.publicUrl;

    let coordinates = null;
    let shotAt: Date | null = null;

    try {
      const exifData = await extractExif(buffer);
      coordinates = exifData.coordinates;
      shotAt = exifData.dateTaken;
    } catch {
      console.log('No EXIF in video, using current date');
    }

    if (!coordinates) {
      await supabase.from('media').insert({
        id: mediaId,
        trip_id: activeTrip.id,
        user_id: user.id,
        telegram_file_id: video.file_id,
        file_url: videoUrl,
        thumbnail_url: null,
        shot_at: shotAt?.toISOString() || new Date().toISOString(),
        caption,
        pending_download: false,
        file_size_bytes: fileSize,
        media_type: 'video',
      });

      await insertCaptionReview(caption, {
        tripId: activeTrip.id,
        userId: user.id,
        locationId: null,
        shotAt: shotAt ?? new Date(),
      });

      await ctx.reply(
        '🎬 Видео сохранено, но без геолокации.\n\n' +
          'Отправьте геолокацию (📎 → Геопозиция), чтобы привязать к месту.',
        {
          reply_to_message_id: ctx.message?.message_id,
        }
      );
      return;
    }

    const { data: existingLocations } = await supabase
      .from('locations')
      .select('*')
      .eq('trip_id', activeTrip.id);

    let location = findNearestLocation(coordinates, existingLocations || []);

    if (!location) {
      const geocodeResult = await reverseGeocode(coordinates);
      const wikiResult = geocodeResult
        ? await searchWikipedia(geocodeResult.name)
        : null;

      const { data: newLocation, error } = await supabase
        .from('locations')
        .insert({
          trip_id: activeTrip.id,
          name: geocodeResult?.name || 'Неизвестное место',
          address: geocodeResult?.address || null,
          city: geocodeResult?.city || null,
          country: geocodeResult?.country || null,
          lat: coordinates.lat,
          lng: coordinates.lng,
          description: wikiResult?.description || null,
          wiki_url: wikiResult?.url || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Location creation error:', error);
      }

      location = newLocation;
    }

    await supabase.from('media').insert({
      id: mediaId,
      trip_id: activeTrip.id,
      location_id: location?.id || null,
      user_id: user.id,
      telegram_file_id: video.file_id,
      file_url: videoUrl,
      thumbnail_url: null,
      shot_at: shotAt?.toISOString() || new Date().toISOString(),
      lat: coordinates.lat,
      lng: coordinates.lng,
      caption,
      pending_download: false,
      file_size_bytes: fileSize,
      media_type: 'video',
    });

    await insertCaptionReview(caption, {
      tripId: activeTrip.id,
      userId: user.id,
      locationId: location?.id ?? null,
      shotAt: shotAt ?? new Date(),
    });
  } catch (error) {
    console.error('Video handling error:', error);
    await ctx.reply('❌ Ошибка обработки видео. Попробуйте ещё раз.');
  }
}
