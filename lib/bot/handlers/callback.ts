import type { BotContext } from '../index';

const HELP_TEXT: Record<string, string> = {
  location:
    '📍 Отзыв по локации\n\n' +
    '• Подпись к фото или видео сохраняется как отзыв.\n' +
    '• Ответьте текстом на сообщение с фото/видео.\n' +
    '• Или команда: /review_location ваш текст',
  day:
    '📅 Отзыв на день\n\n' +
    'Команда: /review_day ваш текст — отзыв за сегодняшний день.',
  trip:
    '🧳 Отзыв о путешествии\n\n' +
    'Команда: /review_trip ваш текст — общий отзыв о поездке.',
};

export async function handleReviewHelpCallback(ctx: BotContext): Promise<void> {
  const kind = ctx.match?.[1];
  if (!kind) return;
  const text = HELP_TEXT[kind];
  if (!text) return;

  await ctx.answerCallbackQuery();
  await ctx.reply(text, {
    reply_to_message_id: ctx.callbackQuery?.message?.message_id,
  });
}
