'use client'

import { useEffect, useState } from 'react'
import { TravelStoryView } from './travel-story-view'
import type { TravelStory } from '@/lib/types/travel-story'

/**
 * Live-режим грузит историю через API в браузере: так не тянем сотни медиа
 * через границу RSC → Client (из‑за этого страница могла «висеть» или не открываться).
 */
export function TravelStoryLiveLoader({ tripId }: { tripId: string }) {
  const [story, setStory] = useState<TravelStory | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/trip/${tripId}/travel-story?live=1`, {
          cache: 'no-store',
        })
        if (cancelled) return
        if (res.status === 404) {
          setError('not_found')
          return
        }
        if (!res.ok) {
          setError('http')
          return
        }
        const data = (await res.json()) as TravelStory
        if (!cancelled) setStory(data)
      } catch {
        if (!cancelled) setError('network')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tripId])

  if (error === 'not_found') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg text-muted-foreground">Поездка не найдена.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg text-muted-foreground">
          Не удалось загрузить историю из базы. Попробуйте обновить страницу.
        </p>
        <p className="text-sm text-muted-foreground/80">Код: {error}</p>
      </div>
    )
  }

  if (!story) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-ink-green/30 border-t-ink-green"
          aria-hidden
        />
        <p className="text-muted-foreground">Собираем историю из базы…</p>
      </div>
    )
  }

  return <TravelStoryView initialStory={story} tripId={tripId} />
}
