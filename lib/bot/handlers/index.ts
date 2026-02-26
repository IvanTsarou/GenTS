import type { Bot } from 'grammy';
import type { BotContext } from '../index';
import { handlePhoto } from './photo';
import { handleDocument } from './document';
import { handleVoice } from './voice';
import { handleText } from './text';
import { handleLocation } from './location';

export function setupHandlers(bot: Bot<BotContext>): void {
  bot.on('message:photo', handlePhoto);
  bot.on('message:document', handleDocument);
  bot.on('message:voice', handleVoice);
  bot.on('message:audio', handleVoice);
  bot.on('message:location', handleLocation);
  bot.on('message:text', handleText);
}
