import { handleWebhook } from '@/lib/bot';

export async function POST(request: Request): Promise<Response> {
  return handleWebhook(request);
}

export function GET(): Response {
  return new Response('GenTS Telegram Bot Webhook', { status: 200 });
}
