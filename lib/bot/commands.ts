import type { Bot } from 'grammy';
import type { BotCommand } from '@grammyjs/types';
import type { BotContext } from './index';
import { supabase, type User } from '@/lib/supabase';
import { extractCommandText, insertTextReview } from '@/lib/reviews';
import { askForInlineText } from './pending-input';

type AuthenticatedContext = BotContext & { user: User };

/** Меню для участников (не админов): без поездок, генерации и /start в списке. */
export const BOT_MENU_COMMANDS_PUBLIC: BotCommand[] = [
  { command: 'help', description: 'Справка' },
  { command: 'status', description: 'Статистика поездки' },
  { command: 'locations', description: 'Список локаций' },
  { command: 'review_location', description: 'Отзыв по локации' },
  { command: 'review_day', description: 'Отзыв на день' },
  { command: 'review_trip', description: 'Отзыв о путешествии' },
];

/** Полное меню (is_admin в БД): + начало, поездки, генерация. */
export const BOT_MENU_COMMANDS_ADMIN: BotCommand[] = [
  { command: 'start', description: 'Начало работы' },
  { command: 'help', description: 'Справка' },
  { command: 'status', description: 'Статистика поездки' },
  { command: 'locations', description: 'Список локаций' },
  { command: 'triplist', description: 'Список поездок' },
  { command: 'tripnew', description: 'Новая поездка' },
  { command: 'generate', description: 'Сгенерировать story' },
  { command: 'review_location', description: 'Отзыв по локации' },
  { command: 'review_day', description: 'Отзыв на день' },
  { command: 'review_trip', description: 'Отзыв о путешествии' },
];

const menuSyncCache = new Map<string, number>();
const MENU_SYNC_TTL_MS = 5 * 60 * 1000;

/** Текст «нет поездки»: не-админам не предлагаем /tripnew. */
export function noActiveTripMessage(user: User): string {
  if (user.is_admin) {
    return '❌ Нет активной поездки.\n\nСоздайте поездку: /tripnew [название]';
  }
  return '❌ Нет активной поездки.\n\nПопросите администратора создать поездку.';
}

/** Обновляет меню команд для этого пользователя в этом чате (личка или группа). */
export async function syncBotMenuForUser(ctx: BotContext, user: User): Promise<void> {
  if (!ctx.chat || !ctx.from) return;
  const t = ctx.chat.type;
  if (t !== 'private' && t !== 'group' && t !== 'supergroup') return;

  const key = `${ctx.chat.id}:${ctx.from.id}:${user.is_admin}`;
  const now = Date.now();
  const last = menuSyncCache.get(key);
  if (last !== undefined && now - last < MENU_SYNC_TTL_MS) return;
  menuSyncCache.set(key, now);

  const commands = user.is_admin ? BOT_MENU_COMMANDS_ADMIN : BOT_MENU_COMMANDS_PUBLIC;

  try {
    if (t === 'private') {
      await ctx.api.setMyCommands(commands, { scope: { type: 'chat', chat_id: ctx.chat.id } });
    } else {
      await ctx.api.setMyCommands(commands, {
        scope: { type: 'chat_member', chat_id: ctx.chat.id, user_id: ctx.from.id },
      });
    }
  } catch (e) {
    console.error('syncBotMenuForUser failed:', e);
  }
}

export function setupCommands(bot: Bot<BotContext>): void {
  bot.command('start', handleStart);
  bot.command('status', handleStatus);
  bot.command('locations', handleLocations);
  bot.command('generate', handleGenerate);
  bot.command('tripnew', handleTripNew);
  bot.command('triplist', handleTripList);
  bot.command('help', handleHelp);
  bot.command('review_location', handleReviewLocation);
  bot.command('review_day', handleReviewDay);
  bot.command('review_trip', handleReviewTrip);

  void bot.api
    .setMyCommands(BOT_MENU_COMMANDS_PUBLIC)
    .catch((e) => console.error('setMyCommands (default, public) failed:', e));

  void bot.api
    .setMyCommands(BOT_MENU_COMMANDS_PUBLIC, { scope: { type: 'all_group_chats' } })
    .catch((e) => console.error('setMyCommands (all_group_chats, public) failed:', e));
}

async function handleStart(ctx: BotContext): Promise<void> {
  const telegramUser = ctx.from;
  if (!telegramUser) return;

  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramUser.id)
    .single();

  if (!existingUser) {
    const { data: created } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramUser.id,
        name: telegramUser.first_name + (telegramUser.last_name ? ` ${telegramUser.last_name}` : ''),
        username: telegramUser.username,
        is_verified: false,
        is_admin: false,
      })
      .select()
      .single();

    if (created) await syncBotMenuForUser(ctx, created as User);

    await ctx.reply(
      '👋 Добро пожаловать в GenTS — Travel Story Generator!\n\n' +
        '📝 Ваша заявка на доступ отправлена администратору.\n' +
        'Ожидайте подтверждения.'
    );
    return;
  }

  if (!existingUser.is_verified) {
    await syncBotMenuForUser(ctx, existingUser);
    await ctx.reply(
      '⏳ Ваша заявка на рассмотрении.\n' +
        'Ожидайте подтверждения от администратора.'
    );
    return;
  }

  await syncBotMenuForUser(ctx, existingUser);

  if (!existingUser.is_admin) {
    await ctx.reply(
      '⛔ Команда /start доступна только администратору.\n\n' +
        'Используйте /help — справка по доступным командам.'
    );
    return;
  }

  await ctx.reply(
    '👋 С возвращением!\n\n' +
      '📸 Отправьте фото из путешествия\n' +
      '🎤 Запишите голосовое сообщение\n' +
      '✍️ Отзыв: подпись к фото/видео, ответ на фото/видео или /review_*\n\n' +
      'Команды:\n' +
      '/status — статистика\n' +
      '/locations — список локаций\n' +
      '/tripnew — новая поездка\n/triplist — список поездок\n/generate — сгенерировать story\n' +
      '/help — справка'
  );
}

async function handleStatus(ctx: BotContext): Promise<void> {
  const user = (ctx as AuthenticatedContext).user;
  if (!user) return;

  const activeTrip = await getActiveTrip(ctx);
  if (!activeTrip) {
    await ctx.reply(noActiveTripMessage(user));
    return;
  }

  const { data: media } = await supabase
    .from('media')
    .select('id, shot_at')
    .eq('trip_id', activeTrip.id);

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id')
    .eq('trip_id', activeTrip.id);

  const { data: locations } = await supabase
    .from('locations')
    .select('id')
    .eq('trip_id', activeTrip.id);

  const photosCount = media?.length || 0;
  const reviewsCount = reviews?.length || 0;
  const locationsCount = locations?.length || 0;

  const uniqueDates = new Set(
    media
      ?.filter((m) => m.shot_at)
      .map((m) => new Date(m.shot_at!).toDateString())
  );
  const daysCount = uniqueDates.size;

  await ctx.reply(
    `📊 Статистика поездки "${activeTrip.name}":\n\n` +
      `📅 Дней: ${daysCount}\n` +
      `📍 Локаций: ${locationsCount}\n` +
      `📸 Фото: ${photosCount}\n` +
      `💬 Отзывов: ${reviewsCount}`
  );
}

async function handleLocations(ctx: BotContext): Promise<void> {
  const user = (ctx as AuthenticatedContext).user;
  if (!user) return;

  const activeTrip = await getActiveTrip(ctx);
  if (!activeTrip) {
    await ctx.reply(noActiveTripMessage(user));
    return;
  }

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, city, country')
    .eq('trip_id', activeTrip.id)
    .order('created_at', { ascending: true });

  if (!locations || locations.length === 0) {
    await ctx.reply('📍 Пока нет локаций. Отправьте фото с геолокацией!');
    return;
  }

  const locationsList = await Promise.all(
    locations.map(async (loc, index) => {
      const { count: photosCount } = await supabase
        .from('media')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', loc.id);

      const { count: reviewsCount } = await supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', loc.id);

      const locationName = loc.name || loc.city || 'Без названия';
      const place = [loc.city, loc.country].filter(Boolean).join(', ');

      return `${index + 1}. ${locationName}${place ? ` (${place})` : ''}\n   📸 ${photosCount || 0} | 💬 ${reviewsCount || 0}`;
    })
  );

  await ctx.reply(`📍 Локации поездки "${activeTrip.name}":\n\n${locationsList.join('\n')}`);
}

async function handleGenerate(ctx: BotContext): Promise<void> {
  const user = (ctx as AuthenticatedContext).user;
  if (!user) return;

  if (!user.is_admin) {
    await ctx.reply('⛔ Эта команда доступна только администратору.');
    return;
  }

  const activeTrip = await getActiveTrip(ctx);
  if (!activeTrip) {
    await ctx.reply('❌ Нет активной поездки для генерации.');
    return;
  }

  await ctx.reply(
    '🚧 Функция генерации story в разработке.\n\n' +
      'После поездки мы обработаем данные вместе через IDE.'
  );
}

async function handleTripNew(ctx: BotContext): Promise<void> {
  const user = (ctx as AuthenticatedContext).user;
  if (!user) return;

  if (!user.is_admin) {
    await ctx.reply('⛔ Только администратор может создавать поездки.');
    return;
  }

  const text = ctx.message?.text || '';
  const tripName = text.replace(/^\/tripnew\s*/i, '').trim();
  if (!tripName) {
    await askForInlineText(ctx, {
      kind: 'tripnew',
      prompt: 'Введите название поездки одним сообщением.',
      placeholder: 'Напр. Оман — март 2025',
    });
    return;
  }

  const chatId = ctx.chat?.id;
  const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

  const { data: newTrip, error } = await supabase
    .from('trips')
    .insert({
      name: tripName,
      created_by: user.id,
      telegram_group_id: isGroup ? chatId : null,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    await ctx.reply('❌ Ошибка создания поездки.');
    return;
  }

  await ctx.reply(`✅ Поездка "${newTrip.name}" создана!\n\nТеперь можно отправлять фото и отзывы.`);
}

async function handleTripList(ctx: BotContext): Promise<void> {
  const user = (ctx as AuthenticatedContext).user;
  if (!user) return;

  if (!user.is_admin) {
    await ctx.reply('⛔ Эта команда доступна только администратору.');
    return;
  }

  const chatId = ctx.chat?.id;
  const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

  let query = supabase.from('trips').select('*').order('created_at', { ascending: false });

  if (isGroup) {
    query = query.eq('telegram_group_id', chatId);
  } else {
    query = query.eq('created_by', user.id);
  }

  const { data: trips } = await query;

  if (!trips || trips.length === 0) {
    await ctx.reply(
      user.is_admin
        ? '📋 Нет поездок.\n\nСоздайте: /tripnew [название]'
        : '📋 Поездок нет или нет доступа. Обратитесь к администратору.'
    );
    return;
  }

  const tripsList = trips.map((trip, index) => {
    const status = trip.status === 'active' ? '🟢' : '⚪';
    return `${index + 1}. ${status} ${trip.name}`;
  });

  await ctx.reply(`📋 Ваши поездки:\n\n${tripsList.join('\n')}`);
}

async function handleHelp(ctx: BotContext): Promise<void> {
  const user = (ctx as AuthenticatedContext).user;
  const adminBlock = user?.is_admin
    ? '\nКоманды администратора:\n/start — начало работы\n/tripnew — новая поездка\n/triplist — список поездок\n/generate — сгенерировать story\n'
    : '';

  await ctx.reply(
    '📖 GenTS — Travel Story Generator\n\n' +
      '📸 Фото/видео — дата и геолокация из EXIF (если есть)\n' +
      '🎤 Голосовое — сохраняется как аудио-отзыв\n' +
      '✍️ Текстовый отзыв:\n' +
      '   • подпись к фото/видео\n' +
      '   • ответ на сообщение с фото/видео\n' +
      '   • /review_location, /review_day, /review_trip + текст\n\n' +
      'Команды:\n' +
      '/status — статистика поездки\n' +
      '/locations — список локаций\n' +
      '/help — эта справка' +
      adminBlock +
      '\nВ группе бот принимает медиа от всех участников.'
  );
}

async function handleReviewLocation(ctx: BotContext): Promise<void> {
  const user = (ctx as AuthenticatedContext).user;
  if (!user) return;

  const text = extractCommandText(ctx.message?.text, 'review_location');
  if (!text) {
    await askForInlineText(ctx, {
      kind: 'review_location',
      prompt:
        'Напишите отзыв одним сообщением.\n\n' +
        'Подсказка: можно также ответить текстом на фото/видео — тогда отзыв привяжется к месту.',
      placeholder: 'Ваш отзыв…',
    });
    return;
  }

  const activeTrip = await getActiveTrip(ctx);
  if (!activeTrip) {
    await ctx.reply('❌ Нет активной поездки.');
    return;
  }

  const dayDate = new Date().toISOString().split('T')[0];
  try {
    await insertTextReview({
      tripId: activeTrip.id,
      userId: user.id,
      text,
      scope: 'location',
      locationId: null,
      dayDate,
    });
  } catch (e) {
    console.error('review_location:', e);
    await ctx.reply('❌ Ошибка сохранения отзыва.');
  }
}

async function handleReviewDay(ctx: BotContext): Promise<void> {
  const user = (ctx as AuthenticatedContext).user;
  if (!user) return;

  const text = extractCommandText(ctx.message?.text, 'review_day');
  if (!text) {
    await askForInlineText(ctx, {
      kind: 'review_day',
      prompt: 'Напишите отзыв за сегодня одним сообщением.',
      placeholder: 'Что было сегодня…',
    });
    return;
  }

  const activeTrip = await getActiveTrip(ctx);
  if (!activeTrip) {
    await ctx.reply('❌ Нет активной поездки.');
    return;
  }

  const dayDate = new Date().toISOString().split('T')[0];
  try {
    await insertTextReview({
      tripId: activeTrip.id,
      userId: user.id,
      text,
      scope: 'day',
      locationId: null,
      dayDate,
    });
  } catch (e) {
    console.error('review_day:', e);
    await ctx.reply('❌ Ошибка сохранения отзыва.');
  }
}

async function handleReviewTrip(ctx: BotContext): Promise<void> {
  const user = (ctx as AuthenticatedContext).user;
  if (!user) return;

  const text = extractCommandText(ctx.message?.text, 'review_trip');
  if (!text) {
    await askForInlineText(ctx, {
      kind: 'review_trip',
      prompt: 'Напишите общий отзыв о поездке одним сообщением.',
      placeholder: 'Итоги поездки…',
    });
    return;
  }

  const activeTrip = await getActiveTrip(ctx);
  if (!activeTrip) {
    await ctx.reply('❌ Нет активной поездки.');
    return;
  }

  try {
    await insertTextReview({
      tripId: activeTrip.id,
      userId: user.id,
      text,
      scope: 'trip',
      locationId: null,
      dayDate: null,
    });
  } catch (e) {
    console.error('review_trip:', e);
    await ctx.reply('❌ Ошибка сохранения отзыва.');
  }
}

async function getActiveTrip(ctx: BotContext) {
  const user = (ctx as AuthenticatedContext).user;
  const chatId = ctx.chat?.id;
  const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

  let query = supabase.from('trips').select('*').eq('status', 'active');

  if (isGroup) {
    query = query.eq('telegram_group_id', chatId);
  } else {
    query = query.eq('created_by', user.id);
  }

  const { data: trips } = await query.order('created_at', { ascending: false }).limit(1);

  return trips?.[0] || null;
}

export { getActiveTrip };
