import type { Bot } from 'grammy';
import type { BotContext } from '../index';
import { handlePhoto } from './photo';
import { handleDocument } from './document';
import { handleVideo } from './video';
import { handleVoice } from './voice';
import { handleText } from './text';
import { handleLocation } from './location';

export function setupHandlers(bot: Bot<BotContext>): void {
  bot.on('message:photo', handlePhoto);
  bot.on('message:document', handleDocument);
  bot.on('message:video', handleVideo);
  bot.on('message:video_note', handleVideo);
  bot.on('message:voice', handleVoice);
  bot.on('message:audio', handleVoice);
  bot.on('message:location', handleLocation);
  bot.on('message:text', handleText);
}
