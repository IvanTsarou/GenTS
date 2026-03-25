'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Check, X } from 'lucide-react'
import type { Location, TransportType } from '@/lib/types/travel-story'
import { PolaroidPhoto } from './polaroid-photo'
import { FullscreenLocationMediaViewer } from './fullscreen-location-media-viewer'
import { TransportDoodle } from './transport-doodle'
import { ScrapbookComments } from './scrapbook-comments'
import { useEditMode } from '@/hooks/use-edit-mode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { sortMediaByOrder } from '@/lib/travel-story-media'

interface ScrapbookPageProps {
  location: Location
  dayNumber: number
  locationIndex: number
  totalLocations: number
  nextTransport?: TransportType
  isActive: boolean
}

/** Страницы скрапбука — смена фона (песок / крафт / морская вода / закат) */
const pageColors = [
  'bg-paper-cream',
  'bg-paper-kraft',
  'bg-washi-mint/28',
  'bg-washi-pink/12',
]

const tapeRotations = [
  'rotate-[-8deg]',
  'rotate-[5deg]',
  'rotate-[-3deg]',
  'rotate-[10deg]',
]

export function ScrapbookPage({ 
  location, 
  dayNumber, 
  locationIndex,
  totalLocations,
  nextTransport,
  isActive 
}: ScrapbookPageProps) {
  const pageRef = useRef<HTMLDivElement>(null)
  const { isEditMode, updateLocationDescription, updateLocationName, updateLocationSource } = useEditMode()
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [tempName, setTempName] = useState(location.name)
  const [tempDescription, setTempDescription] = useState(location.description)
  const [tempSourceDesc, setTempSourceDesc] = useState(location.sourceDescription ?? '')
  const [tempSourceUrl, setTempSourceUrl] = useState(location.sourceUrl ?? '')
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)
  const [fullscreenLocationId, setFullscreenLocationId] = useState(location.id)
  const [fullscreenMediaId, setFullscreenMediaId] = useState<string | null>(null)

  useEffect(() => {
    setTempName(location.name)
    setTempDescription(location.description)
    setTempSourceDesc(location.sourceDescription ?? '')
    setTempSourceUrl(location.sourceUrl ?? '')
  }, [location.id, location.name, location.description, location.sourceDescription, location.sourceUrl])
  
  const bgColor = pageColors[locationIndex % pageColors.length]

  const orderedMedia = useMemo(() => sortMediaByOrder(location.media), [location.media])

  return (
    <>
      <section
      ref={pageRef}
      className={cn(
        "min-h-screen w-full snap-start snap-always",
        "flex items-center justify-center p-4 md:p-8",
        "relative overflow-hidden"
      )}
    >
      {/* Paper texture background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/50 to-muted" />
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
      }} />
      
      {/* Decorative tape strips */}
      <div className="absolute top-8 left-8 w-20 h-6 bg-washi-pink/60 rotate-[-15deg] opacity-70" />
      <div className="absolute top-12 right-12 w-16 h-5 bg-washi-mint/70 rotate-[8deg] opacity-60" />
      <div className="absolute bottom-20 left-16 w-24 h-5 bg-washi-pink/50 rotate-[12deg] opacity-50" />

      <div
        className={cn(
          "relative w-full max-w-6xl",
          "rounded-sm shadow-2xl",
          bgColor,
          "p-6 md:p-10 lg:p-14"
        )}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
        }}
      >
        {/* Page corner fold */}
        <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-background/80 to-muted transform rotate-45 translate-x-12 -translate-y-12 shadow-inner" />
        </div>

        {/* Day badge - stamp style */}
        <motion.div 
          className="absolute -top-3 -left-3 md:top-4 md:left-4"
          initial={{ rotate: -12, scale: 0 }}
          animate={{ rotate: -12, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <div className="relative">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-dashed border-stamp-red flex items-center justify-center bg-paper-cream">
              <div className="text-center">
                <span className="block text-xs md:text-sm font-bold text-stamp-red uppercase tracking-wider">Day</span>
                <span className="block text-2xl md:text-3xl font-bold text-stamp-red font-[family-name:var(--font-handwritten)]">{dayNumber}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Location title - handwritten style */}
        <div className="mb-8 md:mb-12 pl-20 md:pl-28">
          {isEditMode && isEditingName ? (
            <motion.div
              className="flex flex-wrap items-center gap-2"
              initial={{ opacity: 0, x: -10 }}
              animate={isActive ? { opacity: 1, x: 0 } : {}}
            >
              <MapPin className="h-8 w-8 shrink-0 text-stamp-red" />
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="min-w-[12rem] flex-1 bg-transparent text-4xl font-bold text-ink-green outline-none ring-2 ring-ink-green/40 rounded-lg px-2 py-1 md:text-5xl lg:text-6xl font-[family-name:var(--font-handwritten)]"
                autoFocus
              />
              <Button size="icon" variant="ghost" onClick={() => { updateLocationName(location.id, tempName); setIsEditingName(false) }}>
                <Check className="h-6 w-6 text-ink-green" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => { setTempName(location.name); setIsEditingName(false) }}>
                <X className="h-6 w-6 text-stamp-red" />
              </Button>
            </motion.div>
          ) : (
            <motion.h2
              className={cn(
                'text-4xl md:text-5xl lg:text-6xl font-bold text-ink-green font-[family-name:var(--font-handwritten)] leading-tight',
                isEditMode && 'cursor-pointer rounded-lg hover:ring-2 hover:ring-ink-green/30'
              )}
              initial={{ opacity: 0, x: -20 }}
              animate={isActive ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.3 }}
              onClick={() => isEditMode && setIsEditingName(true)}
            >
              {location.name}
            </motion.h2>
          )}
          
          {/* Underline doodle */}
          <svg className="w-48 h-4 mt-2 text-washi-pink" viewBox="0 0 200 20">
            <path 
              d="M0 10 Q50 0, 100 10 T200 10" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left side - Photos */}
          <div className="space-y-6">
            <div className="relative">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setFullscreenLocationId(location.id)
                  setFullscreenMediaId(null)
                  setIsFullscreenOpen(true)
                }}
                className="absolute left-3 top-3 z-30 rounded-full shadow-sm bg-background/80"
              >
                Полный просмотр
              </Button>

              {/* Main polaroid */}
              {orderedMedia[0] && (
                <PolaroidPhoto
                  key={orderedMedia[0].id}
                  media={orderedMedia[0]}
                  locationId={location.id}
                  rotation={tapeRotations[0]}
                  size="large"
                  onOpenFullscreen={() => {
                    setFullscreenLocationId(location.id)
                    setFullscreenMediaId(orderedMedia[0].id)
                    setIsFullscreenOpen(true)
                  }}
                />
              )}
              
              {/* Overlapping smaller polaroids */}
              <div className="absolute -bottom-4 -right-4 md:-bottom-8 md:-right-8 z-10">
                {orderedMedia[1] && (
                  <PolaroidPhoto 
                    key={orderedMedia[1].id}
                    media={orderedMedia[1]} 
                    locationId={location.id}
                    rotation={tapeRotations[1]}
                    size="small"
                    onOpenFullscreen={() => {
                      setFullscreenLocationId(location.id)
                      setFullscreenMediaId(orderedMedia[1].id)
                      setIsFullscreenOpen(true)
                    }}
                  />
                )}
              </div>
            </div>

            {/* More photos in a row */}
            {orderedMedia.length > 2 && (
              <div className="flex gap-4 mt-8">
                {orderedMedia.slice(2, 5).map((media, idx) => (
                  <PolaroidPhoto 
                    key={media.id}
                    media={media} 
                    locationId={location.id}
                    rotation={tapeRotations[(idx + 2) % tapeRotations.length]}
                    size="tiny"
                    onOpenFullscreen={() => {
                      setFullscreenLocationId(location.id)
                      setFullscreenMediaId(media.id)
                      setIsFullscreenOpen(true)
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right side - Description & Comments */}
          <div className="space-y-6">
            {/* Description on "paper" */}
            <motion.div 
              className="bg-paper-cream p-6 shadow-md relative"
              style={{ 
                transform: 'rotate(1deg)',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={isActive ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 }}
            >
              {/* Paper clip */}
              <div className="absolute -top-4 left-8 w-6 h-10 border-2 border-muted-foreground/40 rounded-full bg-transparent" 
                style={{ borderBottomColor: 'transparent', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
              />
              
              {isEditMode && isEditingDescription ? (
                <div className="space-y-4 font-sans">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">Текст описания</Label>
                    <textarea
                      value={tempDescription}
                      onChange={(e) => setTempDescription(e.target.value)}
                      className="min-h-[140px] w-full resize-y rounded-md bg-background/80 p-3 text-lg text-foreground/90 outline-none ring-2 ring-ink-green/40 md:text-xl font-[family-name:var(--font-handwritten)] leading-relaxed"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2 rounded-md border border-border/50 bg-background/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Источник описания</p>
                    <div className="space-y-1">
                      <Label className="text-xs">Подпись к ссылке</Label>
                      <Input
                        value={tempSourceDesc}
                        onChange={(e) => setTempSourceDesc(e.target.value)}
                        placeholder="Wikipedia…"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">URL</Label>
                      <Input
                        type="url"
                        value={tempSourceUrl}
                        onChange={(e) => setTempSourceUrl(e.target.value)}
                        placeholder="https://…"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        updateLocationDescription(location.id, tempDescription)
                        updateLocationSource(location.id, tempSourceDesc, tempSourceUrl)
                        setIsEditingDescription(false)
                      }}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Сохранить
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setTempDescription(location.description)
                        setTempSourceDesc(location.sourceDescription ?? '')
                        setTempSourceUrl(location.sourceUrl ?? '')
                        setIsEditingDescription(false)
                      }}
                    >
                      Отменить
                    </Button>
                  </div>
                </div>
              ) : (
                <p
                  className={cn(
                    'text-lg md:text-xl text-foreground/80 font-[family-name:var(--font-handwritten)] leading-relaxed',
                    isEditMode && 'cursor-pointer rounded-md hover:ring-2 hover:ring-ink-green/30'
                  )}
                  onClick={() => isEditMode && setIsEditingDescription(true)}
                >
                  {location.description || (isEditMode ? 'Нажми, чтобы добавить описание…' : '')}
                </p>
              )}
              
              {(location.sourceDescription || location.sourceUrl) && (
                <p className="mt-3 font-sans text-xs text-muted-foreground">
                  Источник: {location.sourceDescription || 'ссылка'}
                  {location.sourceUrl ? (
                    <a
                      href={location.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 underline"
                    >
                      открыть
                    </a>
                  ) : null}
                </p>
              )}
            </motion.div>

            {/* Comments as sticky notes */}
            <ScrapbookComments comments={location.comments} />
          </div>
        </div>

        {/* Transport to next location */}
        {nextTransport && locationIndex < totalLocations - 1 && (
          <motion.div 
            className="mt-12 flex justify-center"
            initial={{ opacity: 0 }}
            animate={isActive ? { opacity: 1 } : {}}
            transition={{ delay: 0.6 }}
          >
            <TransportDoodle transport={nextTransport} />
          </motion.div>
        )}

        {/* Page number */}
        <div className="absolute bottom-4 right-6 text-muted-foreground/50 font-[family-name:var(--font-handwritten)] text-2xl">
          {locationIndex + 1} / {totalLocations}
        </div>
      </div>
      </section>

      {isFullscreenOpen && (
        <FullscreenLocationMediaViewer
          initialLocationId={fullscreenLocationId}
          initialMediaId={fullscreenMediaId}
          onClose={() => {
            setIsFullscreenOpen(false)
            setFullscreenMediaId(null)
          }}
        />
      )}
    </>
  )
}
