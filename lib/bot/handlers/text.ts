import type { BotContext } from '../index';
import type { User } from '@/lib/supabase';
import { getActiveTrip, noActiveTripMessage } from '../commands';
import { getMediaContextFromReply, insertTextReview } from '@/lib/reviews';

type AuthenticatedContext = BotContext & { user: User };

export async function handleText(ctx: BotContext): Promise<void> {
  const user = (ctx as AuthenticatedContext).user;
  if (!user) return;

  const text = ctx.message?.text;
  if (!text) return;

  if (text.startsWith('/')) return;

  const activeTrip = await getActiveTrip(ctx);
  if (!activeTrip) {
    await ctx.reply(noActiveTripMessage(user));
    return;
  }

  const mediaCtx = await getMediaContextFromReply(ctx.message?.reply_to_message, activeTrip.id);
  if (!mediaCtx) {
    // Только ответ на фото/видео (или документ как фото/видео) в этой поездке — отзыв
    return;
  }

  try {
    await insertTextReview({
      tripId: activeTrip.id,
      userId: user.id,
      text: text.trim(),
      scope: 'location',
      locationId: mediaCtx.locationId,
      dayDate: mediaCtx.dayDate,
    });
  } catch (error) {
    console.error('Text handling error:', error);
    await ctx.reply('❌ Ошибка сохранения отзыва. Попробуйте ещё раз.');
  }
}
