import { supabase } from './supabase';

export type MessageType =
  | 'photo'
  | 'voice'
  | 'audio'
  | 'text'
  | 'command'
  | 'location'
  | 'callback_query'
  | 'unknown';

export async function logBotMessage(
  telegramUserId: number | undefined,
  chatId: number | undefined,
  messageType: MessageType,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const sanitizedPayload = sanitizePayload(payload);

    await supabase.from('bot_logs').insert({
      telegram_user_id: telegramUserId ?? null,
      chat_id: chatId ?? null,
      message_type: messageType,
      payload: sanitizedPayload,
    });
  } catch (error) {
    console.error('Failed to log bot message:', error);
  }
}

function sanitizePayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (
      key === 'file' ||
      key === 'buffer' ||
      key === 'data' ||
      value instanceof Buffer
    ) {
      sanitized[key] = '[binary data]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizePayload(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
