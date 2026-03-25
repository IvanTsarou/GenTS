import type { BotContext } from './index';

export type PendingInputKind = 'tripnew' | 'review_location' | 'review_day' | 'review_trip';

type PendingInput = {
  kind: PendingInputKind;
  promptMessageId: number;
  createdAtMs: number;
};

const TTL_MS = 15 * 60 * 1000;
const pending = new Map<string, PendingInput>();

function keyFromCtx(ctx: BotContext): string | null {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;
  if (!chatId || !userId) return null;
  return `${chatId}:${userId}`;
}

export function setPendingInput(ctx: BotContext, kind: PendingInputKind, promptMessageId: number): void {
  const key = keyFromCtx(ctx);
  if (!key) return;
  pending.set(key, { kind, promptMessageId, createdAtMs: Date.now() });
}

export function consumePendingInputFromReply(
  ctx: BotContext
): { kind: PendingInputKind } | null {
  const key = keyFromCtx(ctx);
  if (!key) return null;
  const cur = pending.get(key);
  if (!cur) return null;
  if (Date.now() - cur.createdAtMs > TTL_MS) {
    pending.delete(key);
    return null;
  }
  const replyTo = ctx.message?.reply_to_message;
  const replyToId = replyTo?.message_id;
  if (!replyToId) return null;
  if (replyToId !== cur.promptMessageId) return null;
  pending.delete(key);
  return { kind: cur.kind };
}

export async function askForInlineText(
  ctx: BotContext,
  options: {
    kind: PendingInputKind;
    prompt: string;
    placeholder?: string;
  }
): Promise<void> {
  const msg = await ctx.reply(options.prompt, {
    reply_markup: {
      force_reply: true,
      input_field_placeholder: options.placeholder,
      selective: true,
    },
  });
  setPendingInput(ctx, options.kind, msg.message_id);
}

