'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditMode } from '@/hooks/use-edit-mode'
import type { MediaItem } from '@/lib/types/travel-story'
import { mediaListSyncKey } from '@/lib/travel-story-image'
import { getMediaSlideIndex } from '@/lib/travel-story-media'
import { FullscreenMediaStrip } from './fullscreen-media-strip'

type FlattenedLocation = {
  locationId: string
  locationName: string
  dayId: string
  dayNumber: number
  dayDate: string
  media: MediaItem[]
}

export function FullscreenLocationMediaViewer({
  initialLocationId,
  initialMediaId,
  onClose,
}: {
  initialLocationId: string
  /** С какого файла открыть горизонтальную ленту (id медиа) */
  initialMediaId?: string | null
  onClose: () => void
}) {
  const { story } = useEditMode()
  const [mounted, setMounted] = useState(false)
  const sectionRefs = useRef<Array<HTMLElement | null>>([])

  useLayoutEffect(() => {
    setMounted(true)
  }, [])

  /** Только локации того же дня, что и открытая — без прокрутки через всю поездку */
  const flattened = useMemo(() => {
    if (!story) return []
    const day = story.days.find((d) => d.locations.some((l) => l.id === initialLocationId))
    if (!day) return []
    return day.locations.map((loc) => ({
      locationId: loc.id,
      locationName: loc.name,
      dayId: day.id,
      dayNumber: day.dayNumber,
      dayDate: day.date,
      media: loc.media,
    }))
  }, [story, initialLocationId])

  const initialIndex = flattened.findIndex((l) => l.locationId === initialLocationId)

  useLayoutEffect(() => {
    if (initialIndex < 0) return
    const id = requestAnimationFrame(() => {
      sectionRefs.current[initialIndex]?.scrollIntoView({ block: 'start', behavior: 'auto' })
    })
    return () => cancelAnimationFrame(id)
  }, [initialIndex, initialMediaId])

  if (!story) return null
  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/90"
      role="presentation"
      onClick={onClose}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Узкая полоса по высоте кнопки; клик слева от кнопки — закрытие (всплывает к корню) */}
      <div
        className="flex shrink-0 items-center justify-end px-4 pb-2"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={onClose}
            className="h-9 gap-2 bg-background/90 px-3 text-foreground shadow-sm"
          >
            <X className="h-4 w-4" />
            Закрыть
          </Button>
        </div>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain scroll-smooth [touch-action:pan-y] snap-y snap-proximity"
        onClick={(e) => e.stopPropagation()}
      >
        {flattened.map((loc, idx) => (
          <section
            key={loc.locationId}
            ref={(el) => {
              sectionRefs.current[idx] = el
            }}
            className="flex min-h-[calc(100svh-4rem)] w-full shrink-0 snap-start snap-always flex-col overflow-x-hidden"
          >
            <div className="shrink-0 border-b border-white/10 bg-gradient-to-br from-ink-green/20 via-background to-washi-mint/15 px-4 py-4 md:px-6 md:py-5">
              <div className="text-xs text-muted-foreground md:text-sm">
                День {loc.dayNumber} ·{' '}
                {loc.dayDate && !Number.isNaN(new Date(loc.dayDate).getTime())
                  ? new Date(loc.dayDate).toLocaleDateString('ru-RU')
                  : loc.dayDate}
              </div>
              <h2 className="mt-1 text-2xl font-bold text-ink-green md:text-4xl">{loc.locationName}</h2>
            </div>

            <div className="flex min-h-0 flex-1 flex-col justify-center px-2 pb-6 pt-2 md:px-4">
              <FullscreenMediaStrip
                key={`${loc.locationId}-${mediaListSyncKey(loc.media)}-${
                  loc.locationId === initialLocationId
                    ? getMediaSlideIndex(loc.media, initialMediaId)
                    : 0
                }`}
                media={loc.media}
                locationId={loc.locationId}
                startIndex={
                  loc.locationId === initialLocationId
                    ? getMediaSlideIndex(loc.media, initialMediaId)
                    : 0
                }
              />
            </div>
          </section>
        ))}
      </div>
    </div>,
    document.body
  )
}
