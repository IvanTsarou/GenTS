import type { BotContext } from '../index';
import type { User } from '@/lib/supabase';
import { getActiveTrip, noActiveTripMessage } from '../commands';
import { getMediaContextFromReply, insertTextReview } from '@/lib/reviews';
import { consumePendingInputFromReply } from '../pending-input';
import { supabase } from '@/lib/supabase';

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

  // Если это ответ на force-reply запрос команды (tripnew/review_*), исполняем команду по введённому тексту.
  const pending = consumePendingInputFromReply(ctx);
  if (pending) {
    const trimmed = text.trim();
    if (!trimmed) {
      await ctx.reply('❌ Пустое сообщение. Попробуйте ещё раз.');
      return;
    }

    if (pending.kind === 'tripnew') {
      if (!user.is_admin) {
        await ctx.reply('⛔ Только администратор может создавать поездки.');
        return;
      }
      const chatId = ctx.chat?.id;
      const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
      const { data: newTrip, error } = await supabase
        .from('trips')
        .insert({
          name: trimmed,
          created_by: user.id,
          telegram_group_id: isGroup ? chatId : null,
          status: 'active',
        })
        .select()
        .single();

      if (error || !newTrip) {
        console.error('tripnew (reply) error:', error);
        await ctx.reply('❌ Ошибка создания поездки.');
        return;
      }

      await ctx.reply(`✅ Поездка "${newTrip.name}" создана!\n\nТеперь можно отправлять фото и отзывы.`);
      return;
    }

    const scope =
      pending.kind === 'review_day' ? 'day' : pending.kind === 'review_trip' ? 'trip' : 'location';
    const dayDate = scope === 'trip' ? null : new Date().toISOString().split('T')[0];

    try {
      await insertTextReview({
        tripId: activeTrip.id,
        userId: user.id,
        text: trimmed,
        scope,
        locationId: null,
        dayDate,
      });
      await ctx.reply('✅ Отзыв сохранён.');
    } catch (error) {
      console.error('review (reply) error:', error);
      await ctx.reply('❌ Ошибка сохранения отзыва. Попробуйте ещё раз.');
    }
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
