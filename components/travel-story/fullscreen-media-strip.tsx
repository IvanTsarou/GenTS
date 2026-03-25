'use client'

import { useCallback, useMemo } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { X, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react'
import { useEditMode } from '@/hooks/use-edit-mode'
import { MediaMoveToLocation } from './media-move-to-location'
import { TravelMediaImage } from './travel-media-image'
import type { MediaItem } from '@/lib/types/travel-story'
import { sortMediaByOrder } from '@/lib/travel-story-media'
import { cn } from '@/lib/utils'

function SlideMedia({ item }: { item: MediaItem }) {
  const isVideo = item.type === 'video' || item.type === 'video_note'
  const isAudio = item.type === 'audio'

  if (isVideo) {
    return (
      <div className="relative flex h-full max-h-[min(72vh,720px)] w-full max-w-[min(96vw,1200px)] items-center justify-center">
        <video
          src={item.url}
          controls
          playsInline
          className={cn(
            'max-h-full max-w-full rounded-lg bg-black',
            item.type === 'video_note' && 'aspect-square max-h-[min(70vh,600px)] rounded-full object-cover'
          )}
          poster={item.thumbnailUrl || undefined}
        />
      </div>
    )
  }

  if (isAudio) {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl bg-white/10 p-8 backdrop-blur-sm">
        <Volume2 className="h-12 w-12 text-white/90" />
        <audio src={item.url} controls className="w-full" />
        {item.caption ? <p className="text-center text-sm text-white/80">{item.caption}</p> : null}
      </div>
    )
  }

  return (
    <div className="relative h-[min(72vh,720px)] w-full max-w-[min(96vw,1200px)]">
      <TravelMediaImage src={item.url} alt={item.caption || 'Фото'} layout="fill-contain" />
    </div>
  )
}

type FullscreenMediaStripProps = {
  media: MediaItem[]
  locationId: string
  /** Индекс слайда после сортировки по order */
  startIndex?: number
}

/**
 * Карусель локации: key на родителе (см. viewer) пересоздаёт Embla при смене медиа — без reInit.
 */
export function FullscreenMediaStrip({
  media,
  locationId,
  startIndex = 0,
}: FullscreenMediaStripProps) {
  const { isEditMode, deleteMedia } = useEditMode()

  const sorted = useMemo(() => sortMediaByOrder(media), [media])

  const safeStart = Math.min(Math.max(0, startIndex), Math.max(0, sorted.length - 1))

  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'x',
    loop: false,
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: false,
    watchResize: true,
    watchDrag: true,
    startIndex: safeStart,
  })

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  if (sorted.length === 0) {
    return (
      <div className="flex h-[min(50dvh,400px)] items-center justify-center text-sm text-white/60">
        Нет медиа для этой локации
      </div>
    )
  }

  return (
    <div className="relative flex w-full flex-col">
      {sorted.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Предыдущее фото"
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/70 md:left-4"
          >
            <ChevronLeft className="h-8 w-8 md:h-10 md:w-10" />
          </button>
          <button
            type="button"
            aria-label="Следующее фото"
            onClick={scrollNext}
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/70 md:right-4"
          >
            <ChevronRight className="h-8 w-8 md:h-10 md:w-10" />
          </button>
        </>
      )}

      {/* Явная высота — иначе Embla часто получает 0 и drag не работает */}
      <div
        ref={emblaRef}
        className="h-[min(72dvh,760px)] w-full max-w-[100vw] overflow-hidden touch-pan-x"
      >
        <div className="flex h-full">
          {sorted.map((m) => (
            <div
              key={m.id}
              className="relative flex h-full min-w-0 flex-[0_0_100%] flex-col items-center justify-center bg-black/40 px-2 py-4 md:px-6"
            >
              {isEditMode && (
                <>
                  <div
                    className="absolute left-3 top-3 z-30 md:left-6 md:top-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MediaMoveToLocation
                      fromLocationId={locationId}
                      mediaId={m.id}
                      variant="compact"
                      className="border border-white/20 bg-black/70 text-white hover:bg-black/85"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label="Удалить файл"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteMedia(locationId, m.id)
                    }}
                    className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white shadow-md ring-1 ring-white/20 transition hover:bg-red-600/90 md:right-6 md:top-6"
                  >
                    <X className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                </>
              )}
              <SlideMedia item={m} />
              {m.caption && !isEditMode ? (
                <div className="pointer-events-none absolute bottom-2 left-0 right-0 px-4 text-center text-sm text-white/90 drop-shadow-md">
                  {m.caption}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {sorted.length > 1 ? (
        <p className="pointer-events-none py-2 text-center text-xs text-white/50">
          Свайп влево-вправо или стрелки · {sorted.length}{' '}
          {sorted.length % 10 === 1 && sorted.length % 100 !== 11
            ? 'файл'
            : [2, 3, 4].includes(sorted.length % 10) && ![12, 13, 14].includes(sorted.length % 100)
              ? 'файла'
              : 'файлов'}
        </p>
      ) : null}
    </div>
  )
}
