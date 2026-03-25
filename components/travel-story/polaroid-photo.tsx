'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { TravelMediaImage } from './travel-media-image'
import { Play, X, Volume2, VolumeX, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MediaItem } from '@/lib/types/travel-story'
import { useEditMode } from '@/hooks/use-edit-mode'
import { MediaMoveToLocation } from './media-move-to-location'
import { POLAROID_SIZES, STORY_IMAGE_QUALITY } from '@/lib/travel-story-image'

interface PolaroidPhotoProps {
  media: MediaItem
  locationId: string
  rotation?: string
  size?: 'tiny' | 'small' | 'large'
  /** @deprecated подпись берётся из media.caption */
  caption?: string
  /** Если задан — клик по полароиду (не в режиме редактирования) открывает полноэкранный просмотр истории */
  onOpenFullscreen?: () => void
}

const sizeClasses = {
  tiny: 'w-24 md:w-32',
  small: 'w-36 md:w-48',
  large: 'w-full max-w-sm md:max-w-md'
}

export function PolaroidPhoto({
  media,
  locationId,
  rotation = '',
  size = 'large',
  caption,
  onOpenFullscreen,
}: PolaroidPhotoProps) {
  const { isEditMode, updateMediaCaption, deleteMedia } = useEditMode()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [captionLocal, setCaptionLocal] = useState(media.caption ?? caption ?? '')

  useEffect(() => {
    setCaptionLocal(media.caption ?? caption ?? '')
  }, [media.id, media.caption, caption])

  const isVideo = media.type === 'video' || media.type === 'video_note'
  const isAudio = media.type === 'audio'
  const canEditCaption = isEditMode && size !== 'tiny'

  const saveCaption = () => updateMediaCaption(media.id, captionLocal)
  const cancelCaption = () => setCaptionLocal(media.caption ?? caption ?? '')

  return (
    <>
      <div
        className={cn(
          'relative bg-white p-2 md:p-3',
          !isEditMode && 'cursor-pointer',
          sizeClasses[size],
          rotation
        )}
        onClick={() => {
          if (isEditMode) return
          if (onOpenFullscreen) {
            onOpenFullscreen()
            return
          }
          setIsExpanded(true)
        }}
        style={{
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06), 4px 4px 0 rgba(0,0,0,0.03)',
        }}
      >
        {/* Tape decoration */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-washi-mint/70 rotate-[-2deg] z-10" />

        {isEditMode && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                deleteMedia(locationId, media.id)
              }}
              className="absolute right-1.5 top-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white shadow-sm ring-1 ring-white/30 transition hover:bg-red-600/90"
              aria-label="Удалить медиа"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <div
              className="absolute bottom-1.5 left-1.5 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <MediaMoveToLocation
                fromLocationId={locationId}
                mediaId={media.id}
                variant="icon"
                className="h-6 w-6 bg-white/95 text-foreground shadow-sm ring-1 ring-black/10"
              />
            </div>
          </>
        )}

        <div className="relative isolate aspect-[4/3] overflow-hidden rounded-[2px] bg-muted">
          {isVideo ? (
            <div className="relative w-full h-full bg-ink-green/10 flex items-center justify-center">
              <Image
                src={media.thumbnailUrl || media.url}
                alt={media.caption || 'Video thumbnail'}
                fill
                sizes={POLAROID_SIZES[size]}
                quality={STORY_IMAGE_QUALITY}
                className="object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-6 h-6 text-ink-green ml-1" />
                </div>
              </div>
              {media.type === 'video_note' && (
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-washi-pink text-white text-xs rounded-full">
                  circle
                </div>
              )}
            </div>
          ) : isAudio ? (
            <div className="w-full h-full bg-gradient-to-br from-washi-mint to-washi-pink/50 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-white/80 flex items-center justify-center">
                  <Volume2 className="w-8 h-8 text-ink-green" />
                </div>
                <span className="text-sm text-ink-green font-[family-name:var(--font-handwritten)]">
                  Voice memo
                </span>
              </div>
            </div>
          ) : (
            <TravelMediaImage
              src={media.url}
              alt={media.caption || 'Photo'}
              layout="fill-cover"
            />
          )}
        </div>

        {/* Polaroid caption area */}
        <div
          className="pt-2 md:pt-3 pb-1"
          onClick={(e) => {
            if (isEditMode) e.stopPropagation()
          }}
        >
          {canEditCaption ? (
            <div className="space-y-2">
              <textarea
                value={captionLocal}
                onChange={(e) => setCaptionLocal(e.target.value)}
                rows={2}
                placeholder="Подпись к кадру…"
                className="w-full resize-none rounded border border-dashed border-ink-green/30 bg-muted/30 px-2 py-1 text-center text-xs text-foreground/80 outline-none focus:border-ink-green/60 md:text-sm font-[family-name:var(--font-handwritten)]"
              />
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    saveCaption()
                  }}
                >
                  <Check className="mr-1 h-4 w-4" />
                  OK
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    cancelCaption()
                  }}
                >
                  <X className="mr-1 h-4 w-4" />
                  Отмена
                </Button>
              </div>
            </div>
          ) : (
            size !== 'tiny' &&
            (caption || media.caption) && (
              <p className="text-center text-xs text-foreground/70 truncate font-[family-name:var(--font-handwritten)] md:text-sm">
                {caption || media.caption}
              </p>
            )
          )}
          {media.timestamp && size === 'large' && (
            <p className="mt-1 text-center text-[10px] text-muted-foreground">
              {new Date(media.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      {/* Expanded view modal */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              className="relative max-w-4xl max-h-[90vh] bg-white p-4 shadow-2xl"
              initial={{ scale: 0.8, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.8, rotate: 5 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="absolute -top-3 -right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-stamp-red text-white shadow-lg transition-colors hover:bg-stamp-red/90"
              >
                <X className="h-5 w-5" />
              </button>

              {isEditMode && (
                <button
                  type="button"
                  onClick={() => {
                    deleteMedia(locationId, media.id)
                    setIsExpanded(false)
                  }}
                  className="absolute -top-3 -left-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white shadow-lg ring-1 ring-white/25 transition hover:bg-red-600/90"
                  aria-label="Удалить медиа"
                >
                  <X className="h-5 w-5" strokeWidth={2.5} />
                </button>
              )}

              {isEditMode && (
                <div
                  className="absolute left-2 top-12 z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MediaMoveToLocation
                    fromLocationId={locationId}
                    mediaId={media.id}
                    variant="compact"
                    className="bg-background text-foreground shadow"
                    onMoved={() => setIsExpanded(false)}
                  />
                </div>
              )}

              {isVideo ? (
                <div className="relative aspect-video bg-black">
                  <video
                    src={media.url}
                    className={cn(
                      "w-full h-full",
                      media.type === 'video_note' && "rounded-full object-cover"
                    )}
                    controls
                    autoPlay
                    muted={isMuted}
                    playsInline
                  />
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>
              ) : isAudio ? (
                <div className="p-8 bg-gradient-to-br from-washi-mint to-washi-pink/30">
                  <audio src={media.url} controls className="w-full" autoPlay />
                </div>
              ) : (
                <TravelMediaImage
                  src={media.url}
                  alt={media.caption || 'Photo'}
                  layout="responsive-contain"
                  maxHeightClass="max-h-[70vh]"
                  className="max-w-[min(92vw,1600px)]"
                />
              )}

              {(isEditMode || media.caption || captionLocal) && (
                <div className="mt-4 w-full max-w-lg">
                  {isEditMode ? (
                    <div className="space-y-3">
                      <textarea
                        value={captionLocal}
                        onChange={(e) => setCaptionLocal(e.target.value)}
                        rows={3}
                        placeholder="Подпись…"
                        className="w-full rounded border border-border bg-muted/40 p-3 text-center text-xl text-foreground outline-none font-[family-name:var(--font-handwritten)]"
                      />
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Button
                          size="sm"
                          onClick={() => saveCaption()}
                        >
                          <Check className="mr-1 h-4 w-4" />
                          Сохранить
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelCaption()}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-xl text-foreground font-[family-name:var(--font-handwritten)]">
                      {media.caption}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
