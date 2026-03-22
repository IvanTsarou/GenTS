import type { BotContext } from '../index';
import type { User } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { uploadAudio } from '@/lib/storage';
import { getActiveTrip } from '../commands';
import { v4 as uuidv4 } from 'uuid';

type AuthenticatedContext = BotContext & { user: User };

const LAST_PHOTO_WINDOW_HOURS = 2;

export async function handleVoice(ctx: BotContext): Promise<void> {
  const user = (ctx as AuthenticatedContext).user;
  if (!user) return;

  const activeTrip = await getActiveTrip(ctx);
  if (!activeTrip) {
    await ctx.reply('❌ Нет активной поездки.');
    return;
  }

  const voice = ctx.message?.voice || ctx.message?.audio;
  if (!voice) return;

  await ctx.reply('🎤 Обрабатываю аудио...');

  try {
    const file = await ctx.api.getFile(voice.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const reviewId = uuidv4();
    const mimeType = voice.mime_type || 'audio/ogg';

    const audioUrl = await uploadAudio(buffer, activeTrip.id, reviewId, mimeType);
    if (!audioUrl) {
      await ctx.reply('❌ Ошибка загрузки аудио. Попробуйте ещё раз.');
      return;
    }

    const location = await findLocationForReview(ctx, user, activeTrip.id);

    const dayDate = new Date().toISOString().split('T')[0];

    await supabase.from('reviews').insert({
      id: reviewId,
      trip_id: activeTrip.id,
      location_id: location?.id || null,
      user_id: user.id,
      text: '[Голосовое сообщение — требуется транскрипция]',
      format: 'audio',
      audio_url: audioUrl,
      day_date: dayDate,
    });

    const locationName = location?.name || 'без привязки к локации';

    await ctx.reply(
      `✅ Голосовое сообщение сохранено!\n\n` +
        `📍 ${locationName}\n\n` +
        `ℹ️ Транскрипция будет выполнена при обработке поездки.`
    );
  } catch (error) {
    console.error('Voice handling error:', error);
    await ctx.reply('❌ Ошибка обработки аудио. Попробуйте ещё раз.');
  }
}

async function findLocationForReview(
  ctx: BotContext,
  user: User,
  tripId: string
) {
  const replyToMessage = ctx.message?.reply_to_message;

  if (replyToMessage && 'photo' in replyToMessage && replyToMessage.photo) {
    const { data: media } = await supabase
      .from('media')
      .select('location_id')
      .eq('trip_id', tripId)
      .eq('telegram_file_id', replyToMessage.photo[replyToMessage.photo.length - 1].file_id)
      .single();

    if (media?.location_id) {
      const { data: location } = await supabase
        .from('locations')
        .select('*')
        .eq('id', media.location_id)
        .single();

      return location;
    }
  }

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

  if (recentMedia?.[0]?.location_id) {
    const { data: location } = await supabase
      .from('locations')
      .select('*')
      .eq('id', recentMedia[0].location_id)
      .single();

    return location;
  }

  return null;
}
