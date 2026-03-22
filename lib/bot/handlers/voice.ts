import type { BotContext } from '../index';
import type { User } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { uploadAudio } from '@/lib/storage';
import { getActiveTrip } from '../commands';
import { getLocationIdForVoice } from '@/lib/reviews';
import { v4 as uuidv4 } from 'uuid';

type AuthenticatedContext = BotContext & { user: User };

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

    const locationId = await getLocationIdForVoice(ctx, user, activeTrip.id);

    const dayDate = new Date().toISOString().split('T')[0];

    await supabase.from('reviews').insert({
      id: reviewId,
      trip_id: activeTrip.id,
      location_id: locationId,
      user_id: user.id,
      text: '[Голосовое сообщение — требуется транскрипция]',
      format: 'audio',
      audio_url: audioUrl,
      day_date: dayDate,
    });
  } catch (error) {
    console.error('Voice handling error:', error);
    await ctx.reply('❌ Ошибка обработки аудио. Попробуйте ещё раз.');
  }
}
