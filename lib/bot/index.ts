import { Bot, webhookCallback } from 'grammy';
import type { Context } from 'grammy';

export type BotContext = Context;

let botInstance: Bot<BotContext> | null = null;

export function getBot(): Bot<BotContext> {
  if (!botInstance) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set');
    }

    botInstance = new Bot<BotContext>(token);

    const { authMiddleware } = require('./middleware/auth');
    const { setupCommands } = require('./commands');
    const { setupHandlers } = require('./handlers');

    botInstance.use(authMiddleware);

    setupCommands(botInstance);
    setupHandlers(botInstance);

    botInstance.catch((err: Error) => {
      console.error('Bot error:', err);
    });
  }

  return botInstance;
}

export async function handleWebhook(request: Request): Promise<Response> {
  const bot = getBot();
  const handler = webhookCallback(bot, 'std/http', {
    secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
  });
  return handler(request);
}
