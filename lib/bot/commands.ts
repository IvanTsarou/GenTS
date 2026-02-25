import type { Bot } from 'grammy';
import type { BotContext } from './index';
import { supabase, type User } from '@/lib/supabase';

type AuthenticatedContext = BotContext & { user: User };

export function setupCommands(bot: Bot<BotContext>): void {
  bot.command('start', handleStart);
  bot.command('status', handleStatus);
  bot.command('locations', handleLocations);
  bot.command('generate', handleGenerate);
  bot.command('tripnew', handleTripNew);
  bot.command('triplist', handleTripList);
  bot.command('help', handleHelp);
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
    await supabase.from('users').insert({
      telegram_id: telegramUser.id,
      name: telegramUser.first_name + (telegramUser.last_name ? ` ${telegramUser.last_name}` : ''),
      username: telegramUser.username,
      is_verified: false,
      is_admin: false,
    });

    await ctx.reply(
      '👋 Добро пожаловать в GenTS — Travel Story Generator!\n\n' +
        '📝 Ваша заявка на доступ отправлена администратору.\n' +
        'Ожидайте подтверждения.'
    );
    return;
  }

  if (!existingUser.is_verified) {
    await ctx.reply(
      '⏳ Ваша заявка на рассмотрении.\n' +
        'Ожидайте подтверждения от администратора.'
    );
    return;
  }

  await ctx.reply(
    '👋 С возвращением!\n\n' +
      '📸 Отправьте фото из путешествия\n' +
      '🎤 Запишите голосовое сообщение\n' +
      '✍️ Или напишите текстовый отзыв\n\n' +
      'Команды:\n' +
      '/status — статистика\n' +
      '/locations — список локаций\n' +
      '/tripnew — новая поездка\n' +
      '/triplist — список поездок\n' +
      '/generate — сгенерировать story\n' +
      '/help — справка'
  );
}

async function handleStatus(ctx: BotContext): Promise<void> {
  const user = (ctx as AuthenticatedContext).user;
  if (!user) return;

  const activeTrip = await getActiveTrip(ctx);
  if (!activeTrip) {
    await ctx.reply('📊 Нет активной поездки.\n\nИспользуйте /tripnew для создания.');
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
    await ctx.reply('📍 Нет активной поездки.');
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
  const tripName = text.replace(/^\/tripnew\s*/i, '').trim() || `Поездка ${new Date().toLocaleDateString('ru')}`;

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
    await ctx.reply('📋 Нет поездок.\n\nИспользуйте /tripnew [название] для создания.');
    return;
  }

  const tripsList = trips.map((trip, index) => {
    const status = trip.status === 'active' ? '🟢' : '⚪';
    return `${index + 1}. ${status} ${trip.name}`;
  });

  await ctx.reply(`📋 Ваши поездки:\n\n${tripsList.join('\n')}`);
}

async function handleHelp(ctx: BotContext): Promise<void> {
  await ctx.reply(
    '📖 GenTS — Travel Story Generator\n\n' +
      '📸 Отправьте фото — бот извлечёт дату и геолокацию из EXIF\n' +
      '🎤 Запишите голосовое — будет сохранено как отзыв\n' +
      '✍️ Напишите текст — добавится к последней локации\n\n' +
      'Команды:\n' +
      '/start — начало работы\n' +
      '/status — статистика поездки\n' +
      '/locations — список локаций\n' +
      '/tripnew — новая поездка (admin)\n' +
      '/triplist — список поездок\n' +
      '/generate — сгенерировать story\n\n' +
      'Лимиты: 3 фото и 3 отзыва на локацию от одного пользователя.'
  );
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
