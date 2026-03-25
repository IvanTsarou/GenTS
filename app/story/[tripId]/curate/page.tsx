import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CurateTripClient } from './curate-trip-client'

export const dynamic = 'force-dynamic'

export default async function CuratePage({ params }: { params: { tripId: string } }) {
  const { tripId } = params

  if (tripId === 'demo') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">Для демо-поездки курация не используется.</p>
        <Link href="/story/demo" className="text-primary underline">
          Вернуться к демо
        </Link>
      </div>
    )
  }

  const { data: trip, error } = await supabase.from('trips').select('id, name').eq('id', tripId).single()

  if (error || !trip) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-card/50 px-4 py-3">
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← На главную
        </Link>
      </div>
      <CurateTripClient tripId={tripId} tripName={trip.name} />
    </div>
  )
}
