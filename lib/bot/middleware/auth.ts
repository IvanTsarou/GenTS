import type { NextFunction } from 'grammy';
import { InlineKeyboard } from 'grammy';
import type { BotContext } from '../index';
import { BOT_MENU_COMMANDS } from '../commands';
import { supabase, type User } from '@/lib/supabase';
import { logBotMessage, type MessageType } from '@/lib/logger';

const PUBLIC_COMMANDS = ['/start'];

export async function authMiddleware(
  ctx: BotContext,
  next: NextFunction
): Promise<void> {
  const telegramUser = ctx.from;
  const chatId = ctx.chat?.id;
  const messageText = ctx.message?.text;
  const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

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

  // Обработка добавления бота в группу (без проверки whitelist)
  if (ctx.myChatMember) {
    const status = ctx.myChatMember.new_chat_member.status;
    const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
    if (isGroup && (status === 'member' || status === 'administrator')) {
      const chatId = ctx.chat?.id;
      if (chatId !== undefined) {
        await ctx.api
          .setMyCommands(BOT_MENU_COMMANDS, {
            scope: { type: 'chat', chat_id: chatId },
          })
          .catch((e) => console.error('setMyCommands (chat) failed:', e));
      }

      const welcomeKb = new InlineKeyboard()
        .text('📍 Отзыв по локации', 'review_help:location')
        .row()
        .text('📅 Отзыв на день', 'review_help:day')
        .row()
        .text('🧳 Отзыв о путешествии', 'review_help:trip');

      await ctx.reply(
        '👋 Добавлен в группу!\n\n' +
          'Создайте поездку командой: /tripnew [название]\n\n' +
          'После этого бот будет обрабатывать фото и видео от всех участников.\n\n' +
          'Текстовые отзывы: подпись к фото/видео, ответ на фото/видео или команды в меню (⋮).',
        { reply_markup: welcomeKb }
      );
    }
    return;
  }

  if (!telegramUser) {
    return;
  }

  if (messageText && PUBLIC_COMMANDS.some((cmd) => messageText.startsWith(cmd))) {
    await next();
    return;
  }

  // В группе: если есть активная поездка для этой группы — разрешаем всем участникам
  if (isGroup && chatId) {
    const { data: groupTrip } = await supabase
      .from('trips')
      .select('id')
      .eq('telegram_group_id', chatId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (groupTrip) {
      const user = await getOrCreateGroupUser(telegramUser);
      (ctx as BotContext & { user: User }).user = user;
      await next();
      return;
    }
  }

  // Личный чат или группа без поездки: требуется whitelist
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

  (ctx as BotContext & { user: User }).user = user;

  await next();
}

/** Создаёт или возвращает пользователя для участника группы (автоверификация) */
async function getOrCreateGroupUser(telegramUser: { id: number; first_name: string; last_name?: string; username?: string }): Promise<User> {
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramUser.id)
    .single();

  if (existing) {
    if (!existing.is_verified) {
      await supabase
        .from('users')
        .update({
          is_verified: true,
          name: telegramUser.first_name + (telegramUser.last_name ? ` ${telegramUser.last_name}` : ''),
          username: telegramUser.username,
        })
        .eq('id', existing.id);
    }
    return existing;
  }

  const { data: created, error } = await supabase
    .from('users')
    .insert({
      telegram_id: telegramUser.id,
      name: telegramUser.first_name + (telegramUser.last_name ? ` ${telegramUser.last_name}` : ''),
      username: telegramUser.username,
      is_verified: true,
      is_admin: false,
    })
    .select()
    .single();

  if (error) throw error;
  return created;
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
