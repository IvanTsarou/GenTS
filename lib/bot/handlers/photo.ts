import type { BotContext } from '../index';
import type { User } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { extractExif } from '@/lib/exif';
import { uploadPhoto } from '@/lib/storage';
import { findNearestLocation } from '@/lib/clustering';
import { reverseGeocode } from '@/lib/geocoding';
import { searchWikipedia } from '@/lib/wikipedia';
import { getActiveTrip } from '../commands';
import { insertCaptionReview } from '@/lib/reviews';
import { v4 as uuidv4 } from 'uuid';

type AuthenticatedContext = BotContext & { user: User };

export async function handlePhoto(ctx: BotContext): Promise<void> {
  const user = (ctx as AuthenticatedContext).user;
  if (!user) return;

  const activeTrip = await getActiveTrip(ctx);
  if (!activeTrip) {
    await ctx.reply(
      '❌ Нет активной поездки.\n\n' +
        'Используйте /tripnew для создания.'
    );
    return;
  }

  const photos = ctx.message?.photo;
  if (!photos || photos.length === 0) return;

  const largestPhoto = photos[photos.length - 1];
  const caption = ctx.message?.caption || null;

  try {
    const file = await ctx.api.getFile(largestPhoto.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const exifData = await extractExif(buffer);

    const mediaId = uuidv4();

    const uploadResult = await uploadPhoto(buffer, activeTrip.id, mediaId);
    if (!uploadResult) {
      await ctx.reply('❌ Ошибка загрузки фото. Попробуйте ещё раз.');
      return;
    }

    let coordinates = exifData.coordinates;
    let shotAt = exifData.dateTaken;

    if (!coordinates) {
      await supabase.from('media').insert({
        id: mediaId,
        trip_id: activeTrip.id,
        user_id: user.id,
        telegram_file_id: largestPhoto.file_id,
        file_url: uploadResult.fileUrl,
        thumbnail_url: uploadResult.thumbnailUrl,
        shot_at: shotAt?.toISOString() || new Date().toISOString(),
        caption,
      });

      await insertCaptionReview(caption, {
        tripId: activeTrip.id,
        userId: user.id,
        locationId: null,
        shotAt: shotAt ?? new Date(),
      });

      await ctx.reply(
        '📍 Фото сохранено, но без геолокации.\n\n' +
          'Отправьте геолокацию (📎 → Геопозиция), чтобы привязать фото к месту.',
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
      telegram_file_id: largestPhoto.file_id,
      file_url: uploadResult.fileUrl,
      thumbnail_url: uploadResult.thumbnailUrl,
      shot_at: shotAt?.toISOString() || new Date().toISOString(),
      lat: coordinates.lat,
      lng: coordinates.lng,
      caption,
    });

    await insertCaptionReview(caption, {
      tripId: activeTrip.id,
      userId: user.id,
      locationId: location?.id ?? null,
      shotAt: shotAt ?? new Date(),
    });
  } catch (error) {
    console.error('Photo handling error:', error);
    await ctx.reply('❌ Ошибка обработки фото. Попробуйте ещё раз.');
  }
}
