import type { BotContext } from '../index';
import type { User } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { extractExif } from '@/lib/exif';
import { uploadPhoto } from '@/lib/storage';
import { findNearestLocation } from '@/lib/clustering';
import { reverseGeocode } from '@/lib/geocoding';
import { searchWikipedia } from '@/lib/wikipedia';
import { getActiveTrip } from '../commands';
import { v4 as uuidv4 } from 'uuid';

type AuthenticatedContext = BotContext & { user: User };

const PHOTO_LIMIT_PER_LOCATION = 3;

export async function handlePhoto(ctx: BotContext): Promise<void> {
  const user = (ctx as AuthenticatedContext).user;
  if (!user) return;

  const activeTrip = await getActiveTrip(ctx);
  if (!activeTrip) {
    await ctx.reply(
      '❌ Нет активной поездки.\n\n' +
        'Попросите администратора создать поездку командой /trip new [название]'
    );
    return;
  }

  const photos = ctx.message?.photo;
  if (!photos || photos.length === 0) return;

  const largestPhoto = photos[photos.length - 1];
  const caption = ctx.message?.caption || null;

  await ctx.reply('📸 Обрабатываю фото...');

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

    if (location) {
      const { count } = await supabase
        .from('media')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', location.id)
        .eq('user_id', user.id);

      if ((count || 0) >= PHOTO_LIMIT_PER_LOCATION) {
        await ctx.reply(
          `⚠️ Достигнут лимит ${PHOTO_LIMIT_PER_LOCATION} фото на эту локацию.\n\n` +
            'Фото сохранено без привязки к локации.'
        );

        await supabase.from('media').insert({
          id: mediaId,
          trip_id: activeTrip.id,
          user_id: user.id,
          telegram_file_id: largestPhoto.file_id,
          file_url: uploadResult.fileUrl,
          thumbnail_url: uploadResult.thumbnailUrl,
          shot_at: shotAt?.toISOString() || new Date().toISOString(),
          lat: coordinates.lat,
          lng: coordinates.lng,
          caption,
        });

        return;
      }
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

    const locationName = location?.name || location?.city || 'новая локация';
    const dateStr = shotAt
      ? shotAt.toLocaleDateString('ru', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'дата неизвестна';

    await ctx.reply(
      `✅ Фото сохранено!\n\n` +
        `📍 ${locationName}\n` +
        `📅 ${dateStr}` +
        (caption ? `\n💬 "${caption}"` : '')
    );
  } catch (error) {
    console.error('Photo handling error:', error);
    await ctx.reply('❌ Ошибка обработки фото. Попробуйте ещё раз.');
  }
}
