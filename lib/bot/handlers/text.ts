import type { BotContext } from '../index';
import type { User } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { getActiveTrip } from '../commands';
import { v4 as uuidv4 } from 'uuid';

type AuthenticatedContext = BotContext & { user: User };

const LAST_PHOTO_WINDOW_HOURS = 2;

export async function handleText(ctx: BotContext): Promise<void> {
  const user = (ctx as AuthenticatedContext).user;
  if (!user) return;

  const text = ctx.message?.text;
  if (!text) return;

  if (text.startsWith('/')) return;

  const activeTrip = await getActiveTrip(ctx);
  if (!activeTrip) {
    await ctx.reply(
      '❌ Нет активной поездки.\n\n' +
        'Попросите администратора создать поездку.'
    );
    return;
  }

  try {
    const location = await findLocationForReview(ctx, user, activeTrip.id);

    const dayDate = new Date().toISOString().split('T')[0];

    await supabase.from('reviews').insert({
      id: uuidv4(),
      trip_id: activeTrip.id,
      location_id: location?.id || null,
      user_id: user.id,
      text,
      format: 'text',
      day_date: dayDate,
    });

    const locationName = location?.name || 'день поездки';

    await ctx.reply(
      `✅ Отзыв сохранён!\n\n` + `📍 Привязан к: ${locationName}`
    );
  } catch (error) {
    console.error('Text handling error:', error);
    await ctx.reply('❌ Ошибка сохранения отзыва. Попробуйте ещё раз.');
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
      .eq(
        'telegram_file_id',
        replyToMessage.photo[replyToMessage.photo.length - 1].file_id
      )
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
