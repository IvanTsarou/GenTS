import { NextRequest, NextResponse } from 'next/server';

export type StoryEditAuthResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

/**
 * Тот же контракт, что PATCH /travel-story и bootstrap: в prod обязателен Bearer STORY_EDIT_TOKEN;
 * в dev без токена в env — пропускаем; если токен задан и заголовок передан — должен совпасть.
 */
export function verifyStoryEditAuth(request: NextRequest): StoryEditAuthResult {
  const token = process.env.STORY_EDIT_TOKEN;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && !token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'STORY_EDIT_TOKEN is required in production' },
        { status: 503 }
      ),
    };
  }

  if (token && isProd) {
    const auth = request.headers.get('authorization');
    const bearer = auth?.replace(/^Bearer\s+/i, '');
    if (bearer !== token) {
      return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
  } else if (token && !isProd) {
    const auth = request.headers.get('authorization');
    const bearer = auth?.replace(/^Bearer\s+/i, '');
    if (bearer && bearer !== token) {
      return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
  }

  return { ok: true };
}
