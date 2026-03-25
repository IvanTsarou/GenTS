import Link from 'next/link'

export default function StoryNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Поездка не найдена</h1>
      <p className="max-w-md text-muted-foreground">
        Проверьте ссылку или UUID поездки в Supabase. Демо без базы:{' '}
        <Link href="/story/demo" className="text-primary underline">
          /story/demo
        </Link>
        .
      </p>
      <Link
        href="/"
        className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
      >
        На главную
      </Link>
    </main>
  )
}
