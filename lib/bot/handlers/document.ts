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
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/mov', 'video/mpeg', 'video/x-m4v'];

export async function handleDocument(ctx: BotContext): Promise<void> {
  const user = (ctx as AuthenticatedContext).user;
  if (!user) return;

  const document = ctx.message?.document;
  if (!document) return;

  const mimeType = document.mime_type?.toLowerCase() || '';
  const fileName = document.file_name?.toLowerCase() || '';

  const isImage = IMAGE_MIME_TYPES.includes(mimeType) ||
    fileName.endsWith('.jpg') ||
    fileName.endsWith('.jpeg') ||
    fileName.endsWith('.png') ||
    fileName.endsWith('.heic') ||
    fileName.endsWith('.heif');

  const isVideo = VIDEO_MIME_TYPES.includes(mimeType) ||
    fileName.endsWith('.mp4') ||
    fileName.endsWith('.mov') ||
    fileName.endsWith('.m4v');

  if (!isImage && !isVideo) {
    return;
  }

  if (isVideo) {
    const fileSize = document.file_size || 0;
    const fileSizeMB = fileSize / (1024 * 1024);
    
    if (fileSizeMB > 20) {
      await handleLargeVideoDocument(ctx, user, document, fileSize, fileSizeMB);
      return;
    }
    await handleVideoDocument(ctx, user, document, fileSize);
    return;
  }

  const activeTrip = await getActiveTrip(ctx);
  if (!activeTrip) {
    await ctx.reply(
      '❌ Нет активной поездки.\n\n' +
        'Используйте /tripnew для создания.'
    );
    return;
  }

  const caption = ctx.message?.caption || null;

  await ctx.reply('📸 Обрабатываю фото (с EXIF)...');

  try {
    const file = await ctx.api.getFile(document.file_id);
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

    const coordinates = exifData.coordinates;
    const shotAt = exifData.dateTaken;

    if (!coordinates) {
      await supabase.from('media').insert({
        id: mediaId,
        trip_id: activeTrip.id,
        user_id: user.id,
        telegram_file_id: document.file_id,
        file_url: uploadResult.fileUrl,
        thumbnail_url: uploadResult.thumbnailUrl,
        shot_at: shotAt?.toISOString() || new Date().toISOString(),
        caption,
      });

      const dateInfo = shotAt
        ? `\n📅 Дата: ${shotAt.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}`
        : '';

      await ctx.reply(
        `📍 Фото сохранено, но без геолокации.${dateInfo}\n\n` +
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
          telegram_file_id: document.file_id,
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
      telegram_file_id: document.file_id,
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
        (caption ? `\n💬 "${caption}"` : '') +
        '\n\n✨ EXIF-данные успешно извлечены!'
    );
  } catch (error) {
    console.error('Document photo handling error:', error);
    await ctx.reply('❌ Ошибка обработки фото. Попробуйте ещё раз.');
  }
}

async function handleLargeVideoDocument(
  ctx: BotContext,
  user: User,
  document: { file_id: string; file_name?: string; mime_type?: string },
  fileSize: number,
  fileSizeMB: number
): Promise<void> {
  const activeTrip = await getActiveTrip(ctx);
  if (!activeTrip) {
    await ctx.reply(
      '❌ Нет активной поездки.\n\n' +
        'Используйте /tripnew для создания.'
    );
    return;
  }

  const caption = ctx.message?.caption || null;

  await ctx.reply(`🎬 Большое видео (${fileSizeMB.toFixed(1)} MB) — сохраняю ссылку для скачивания позже...`);

  try {
    const mediaId = uuidv4();

    await supabase.from('media').insert({
      id: mediaId,
      trip_id: activeTrip.id,
      user_id: user.id,
      telegram_file_id: document.file_id,
      file_url: null,
      thumbnail_url: null,
      shot_at: new Date().toISOString(),
      caption,
      pending_download: true,
      file_size_bytes: fileSize,
      original_filename: document.file_name || null,
      media_type: 'video',
    });

    await ctx.reply(
      `✅ Видео зарегистрировано!\n\n` +
        `📦 Размер: ${fileSizeMB.toFixed(1)} MB\n` +
        `📁 Файл: ${document.file_name || 'без имени'}\n` +
        `⏳ Статус: ожидает скачивания\n\n` +
        'Файл будет скачан после поездки через специальный скрипт.',
      {
        reply_to_message_id: ctx.message?.message_id,
      }
    );
  } catch (error) {
    console.error('Large video registration error:', error);
    await ctx.reply('❌ Ошибка регистрации видео. Попробуйте ещё раз.');
  }
}

async function handleVideoDocument(
  ctx: BotContext,
  user: User,
  document: { file_id: string; file_name?: string; mime_type?: string },
  fileSize: number = 0
): Promise<void> {
  const activeTrip = await getActiveTrip(ctx);
  if (!activeTrip) {
    await ctx.reply(
      '❌ Нет активной поездки.\n\n' +
        'Используйте /tripnew для создания.'
    );
    return;
  }

  const caption = ctx.message?.caption || null;

  await ctx.reply('🎬 Обрабатываю видео...');

  try {
    const file = await ctx.api.getFile(document.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const mediaId = uuidv4();

    const mimeType = document.mime_type || 'video/mp4';
    const extension = mimeType.includes('quicktime') || mimeType.includes('mov') ? 'mov' : 'mp4';
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
      console.log('No EXIF in video');
    }

    if (!coordinates) {
      await supabase.from('media').insert({
        id: mediaId,
        trip_id: activeTrip.id,
        user_id: user.id,
        telegram_file_id: document.file_id,
        file_url: videoUrl,
        thumbnail_url: null,
        shot_at: shotAt?.toISOString() || new Date().toISOString(),
        caption,
        pending_download: false,
        file_size_bytes: fileSize,
        original_filename: document.file_name || null,
        media_type: 'video',
      });

      const dateInfo = shotAt
        ? `\n📅 Дата: ${shotAt.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })}`
        : '';

      await ctx.reply(
        `🎬 Видео сохранено, но без геолокации.${dateInfo}\n\n` +
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
      telegram_file_id: document.file_id,
      file_url: videoUrl,
      thumbnail_url: null,
      shot_at: shotAt?.toISOString() || new Date().toISOString(),
      lat: coordinates?.lat,
      lng: coordinates?.lng,
      caption,
      pending_download: false,
      file_size_bytes: fileSize,
      original_filename: document.file_name || null,
      media_type: 'video',
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
      `✅ Видео сохранено!\n\n` +
        `📍 ${locationName}\n` +
        `📅 ${dateStr}` +
        (caption ? `\n💬 "${caption}"` : '')
    );
  } catch (error) {
    console.error('Video document handling error:', error);
    await ctx.reply('❌ Ошибка обработки видео. Попробуйте ещё раз.');
  }
}
