import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">GenTS</h1>
          <p className="text-lg text-muted-foreground">
            Travel Story Generator — бот в Telegram собирает фото и заметки, здесь они превращаются в
            историю путешествия.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/story/0f2aca21-9b45-4c69-92d0-103086e83baf"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            Открыть поездку
          </Link>
          <Link
            href="/story/0f2aca21-9b45-4c69-92d0-103086e83baf/curate"
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-3 text-sm font-medium shadow-sm transition hover:bg-muted/60"
          >
            Курация (локации и фото)
          </Link>
          <Link
            href="/story/demo"
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-3 text-sm font-medium shadow-sm transition hover:bg-muted/60"
          >
            Демо Travel Story
          </Link>
          <a
            href="https://telegram.org"
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-3 text-sm font-medium"
          >
            Бот (Telegram)
          </a>
        </div>

        <section className="rounded-2xl border border-border bg-card/50 p-6 text-left">
          <h2 className="mb-3 font-semibold">Своя поездка</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Откройте страницу <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/story/&lt;uuid&gt;</code>,
            где <code className="rounded bg-muted px-1.5 py-0.5 text-xs">uuid</code> — идентификатор строки{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">trips</code> в Supabase. Данные подтягиваются из
            медиа, локаций и отзывов; после правок в режиме редактирования снимок сохраняется в{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">trips.story_snapshot</code>.
          </p>
          <p className="text-sm text-muted-foreground">
            В продакшене задайте <code className="rounded bg-muted px-1.5 py-0.5 text-xs">STORY_EDIT_TOKEN</code> и при
            необходимости тот же токен в{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">NEXT_PUBLIC_STORY_EDIT_TOKEN</code> для сохранения
            из браузера (см. README).
          </p>
        </section>
      </div>
    </main>
  )
}
