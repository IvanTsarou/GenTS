'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { TravelMediaImage } from './travel-media-image'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, X, ChevronLeft, ChevronRight, GripVertical, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditMode } from '@/hooks/use-edit-mode'
import { cn } from '@/lib/utils'
import { GALLERY_GRID_SIZES, STORY_IMAGE_QUALITY, mediaListSyncKey } from '@/lib/travel-story-image'
import type { MediaItem } from '@/lib/types/travel-story'
import { MediaMoveToLocation } from './media-move-to-location'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface MediaGalleryProps {
  media: MediaItem[]
  locationId: string
}

interface SortableMediaItemProps {
  item: MediaItem
  locationId: string
  onClick: () => void
  isEditMode: boolean
  onDelete: () => void
}

function SortableMediaItem({ item, locationId, onClick, isEditMode, onDelete }: SortableMediaItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      className={cn(
        "group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl",
        isDragging && "opacity-50 scale-105"
      )}
    >
      {isEditMode && (
        <>
          {/* Drag handle */}
          <div 
            {...attributes} 
            {...listeners}
            className="absolute left-2 top-2 z-20 rounded-md bg-background/80 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          
          {/* Удаление — крестик на превью */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="absolute right-1.5 top-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white shadow-sm ring-1 ring-white/25 transition hover:bg-red-600/90"
            aria-label="Удалить файл"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>

          <div
            className="absolute bottom-1.5 left-1.5 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <MediaMoveToLocation fromLocationId={locationId} mediaId={item.id} variant="icon" />
          </div>
        </>
      )}
      
      <div onClick={onClick} className="absolute inset-0">
        {item.type === 'video' || item.type === 'video_note' ? (
        <Image
          src={item.thumbnailUrl || item.url}
          alt={item.caption || 'Travel video'}
          fill
          sizes={GALLERY_GRID_SIZES}
          quality={STORY_IMAGE_QUALITY}
          className="object-cover"
        />
        ) : item.type === 'audio' ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-washi-mint/40 to-washi-pink/30">
            <span className="text-xs text-foreground/70">Аудио</span>
          </div>
        ) : (
        <TravelMediaImage
          src={item.url}
          alt={item.caption || 'Travel photo'}
          layout="fill-cover"
        />
        )}
        
        {/* Video indicator */}
        {(item.type === 'video' || item.type === 'video_note') && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/20">
            <div className={cn(
              "flex items-center justify-center bg-background/80 backdrop-blur-sm shadow-lg",
              item.type === 'video_note' ? "h-16 w-16 rounded-full" : "h-12 w-12 rounded-full"
            )}>
              <Play className="h-6 w-6 text-foreground ml-0.5" />
            </div>
          </div>
        )}
        
        {/* Video note circular overlay */}
        {item.type === 'video_note' && (
          <div className="absolute inset-0 rounded-xl" style={{
            mask: 'radial-gradient(circle, transparent 45%, black 45%)',
            WebkitMask: 'radial-gradient(circle, transparent 45%, black 45%)',
            background: 'oklch(0.1 0 0 / 0.6)'
          }} />
        )}
        
        {/* Caption on hover */}
        {item.caption && !isEditMode && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-sm text-background line-clamp-2">{item.caption}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function MediaGallery({ media, locationId }: MediaGalleryProps) {
  const { isEditMode, reorderMedia, deleteMedia, updateMediaCaption } = useEditMode()
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [items, setItems] = useState(media)
  const [captionDraft, setCaptionDraft] = useState('')
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const sortedMedia = [...items].sort((a, b) => a.order - b.order)

  const currentMedia = lightboxIndex !== null ? sortedMedia[lightboxIndex] : null

  const mediaSyncKey = useMemo(() => mediaListSyncKey(media), [media])

  useEffect(() => {
    setItems(media)
    // Синхронизация только при смене id/order (не при каждой новой ссылке на [] из context)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- media берём из замыкания того же рендера, что и mediaSyncKey
  }, [mediaSyncKey])

  useEffect(() => {
    if (!currentMedia) return
    setCaptionDraft(currentMedia.caption ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- только при смене слайда/id, полный currentMedia вызвал бы лишние циклы
  }, [lightboxIndex, currentMedia?.id])
  
  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null)
  }, [])

  const goToPrevious = useCallback(() => {
    setLightboxIndex(prev => 
      prev !== null ? (prev === 0 ? sortedMedia.length - 1 : prev - 1) : null
    )
  }, [sortedMedia.length])

  const goToNext = useCallback(() => {
    setLightboxIndex(prev => 
      prev !== null ? (prev === sortedMedia.length - 1 ? 0 : prev + 1) : null
    )
  }, [sortedMedia.length])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      setItems((prevItems) => {
        const oldIndex = prevItems.findIndex(item => item.id === active.id)
        const newIndex = prevItems.findIndex(item => item.id === over.id)
        const newItems = arrayMove(prevItems, oldIndex, newIndex)
        reorderMedia(locationId, newItems.map(item => item.id))
        return newItems
      })
    }
  }

  const handleDelete = (mediaId: string) => {
    setItems(prev => prev.filter(item => item.id !== mediaId))
    deleteMedia(locationId, mediaId)
    setLightboxIndex(null)
  }

  // Grid layout based on number of images
  const getGridClass = () => {
    const count = sortedMedia.length
    if (count === 1) return 'grid-cols-1'
    if (count === 2) return 'grid-cols-2'
    if (count === 3) return 'grid-cols-2 sm:grid-cols-3'
    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
          <div className={cn("grid gap-3", getGridClass())}>
            {sortedMedia.map((item, index) => (
              <SortableMediaItem
                key={item.id}
                item={item}
                locationId={locationId}
                onClick={() => openLightbox(index)}
                isEditMode={isEditMode}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/95 backdrop-blur-sm"
            onClick={closeLightbox}
          >
            {/* Close button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={closeLightbox}
              className="absolute right-4 top-4 text-background hover:bg-background/20"
            >
              <X className="h-6 w-6" />
            </Button>
            
            {/* Navigation */}
            {sortedMedia.length > 1 && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); goToPrevious() }}
                  className="absolute left-4 text-background hover:bg-background/20"
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); goToNext() }}
                  className="absolute right-4 text-background hover:bg-background/20"
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}
            
            {/* Image */}
            <motion.div
              key={lightboxIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="relative max-h-[85vh] max-w-[85vw]"
              onClick={(e) => e.stopPropagation()}
            >
              {isEditMode && currentMedia && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(currentMedia.id)
                    }}
                    className="absolute left-2 top-2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white shadow-md ring-1 ring-white/25 transition hover:bg-red-600/90"
                    aria-label="Удалить файл"
                  >
                    <X className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                  <div className="absolute left-2 top-14 z-30" onClick={(e) => e.stopPropagation()}>
                    <MediaMoveToLocation
                      fromLocationId={locationId}
                      mediaId={currentMedia.id}
                      variant="compact"
                      className="bg-background/90 text-foreground shadow-md"
                      onMoved={closeLightbox}
                    />
                  </div>
                </>
              )}
              {sortedMedia[lightboxIndex].type === 'video' ||
              sortedMedia[lightboxIndex].type === 'video_note' ? (
                <video
                  src={sortedMedia[lightboxIndex].url}
                  controls
                  playsInline
                  className="max-h-[85vh] max-w-[85vw] rounded-lg bg-black"
                  poster={sortedMedia[lightboxIndex].thumbnailUrl || undefined}
                />
              ) : sortedMedia[lightboxIndex].type === 'audio' ? (
                <div className="w-full max-w-md rounded-lg bg-white/10 p-6">
                  <audio src={sortedMedia[lightboxIndex].url} controls className="w-full" />
                </div>
              ) : (
                <TravelMediaImage
                  src={sortedMedia[lightboxIndex].url}
                  alt={sortedMedia[lightboxIndex].caption || 'Travel photo'}
                  layout="responsive-contain"
                  maxHeightClass="max-h-[85vh]"
                  className="rounded-lg"
                />
              )}
              
              {/* Caption */}
              {currentMedia && (
                <>
                  {isEditMode ? (
                    <div className="absolute inset-x-0 bottom-14 bg-background/80 backdrop-blur-sm p-4 rounded-b-lg">
                      <textarea
                        value={captionDraft}
                        onChange={(e) => setCaptionDraft(e.target.value)}
                        className="w-full resize-none rounded-md bg-background/60 p-2 text-sm outline-none ring-2 ring-primary/30"
                        rows={3}
                        placeholder="Подпись к кадру…"
                      />
                      <div className="mt-3 flex flex-wrap gap-2 justify-center">
                        <Button
                          size="sm"
                          onClick={() => {
                            updateMediaCaption(currentMedia.id, captionDraft)
                          }}
                        >
                          <Check className="mr-1 h-4 w-4" />
                          Сохранить
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCaptionDraft(currentMedia.caption ?? '')}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    currentMedia.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent p-4 pt-12 rounded-b-lg">
                        <p className="text-center text-background">
                          {currentMedia.caption}
                        </p>
                      </div>
                    )
                  )}
                </>
              )}
            </motion.div>
            
            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background/20 px-4 py-2 text-sm text-background backdrop-blur-sm">
              {lightboxIndex + 1} / {sortedMedia.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
