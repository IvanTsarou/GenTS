import type { NextFunction } from 'grammy';
import type { BotContext } from '../index';
import { supabase } from '@/lib/supabase';
import { logBotMessage, type MessageType } from '@/lib/logger';

const PUBLIC_COMMANDS = ['/start'];

export async function authMiddleware(
  ctx: BotContext,
  next: NextFunction
): Promise<void> {
  const telegramUser = ctx.from;
  const chatId = ctx.chat?.id;
  const messageText = ctx.message?.text;

  await logBotMessage(
    telegramUser?.id,
    chatId,
    getMessageType(ctx) as MessageType,
    {
      message_id: ctx.message?.message_id,
      text: messageText?.slice(0, 100),
      chat_type: ctx.chat?.type,
    }
  );

  if (!telegramUser) {
    return;
  }

  if (messageText && PUBLIC_COMMANDS.some((cmd) => messageText.startsWith(cmd))) {
    await next();
    return;
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramUser.id)
    .single();

  if (!user) {
    await ctx.reply(
      '⛔ У вас нет доступа к боту.\n\n' +
        'Обратитесь к администратору для получения доступа.'
    );
    return;
  }

  if (!user.is_verified) {
    await ctx.reply(
      '⏳ Ваш аккаунт ожидает верификации.\n\n' +
        'Обратитесь к администратору.'
    );
    return;
  }

  (ctx as BotContext & { user: typeof user }).user = user;

  await next();
}

function getMessageType(ctx: BotContext): string {
  if (ctx.message?.photo) return 'photo';
  if (ctx.message?.voice) return 'voice';
  if (ctx.message?.audio) return 'audio';
  if (ctx.message?.location) return 'location';
  if (ctx.message?.text?.startsWith('/')) return 'command';
  if (ctx.message?.text) return 'text';
  if (ctx.callbackQuery) return 'callback_query';
  return 'unknown';
}
