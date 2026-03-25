'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Check, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditMode } from '@/hooks/use-edit-mode'
import { cn } from '@/lib/utils'
import { ruPlacesWord, ruDaysWord } from '@/lib/ru-plural'

export function ScrapbookHeader() {
  const { story, isEditMode, updateStoryTitle, updateStoryDates } = useEditMode()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState(story?.title || '')
  const [isEditingDates, setIsEditingDates] = useState(false)
  const [tempStart, setTempStart] = useState(story?.startDate || '')
  const [tempEnd, setTempEnd] = useState(story?.endDate || '')
  useEffect(() => {
    if (!story) return
    setTempTitle(story.title)
    setTempStart(story.startDate)
    setTempEnd(story.endDate)
  }, [story])

  if (!story) return null

  const handleSaveTitle = () => {
    updateStoryTitle(tempTitle)
    setIsEditingTitle(false)
  }

  const dateRange = `${new Date(story.startDate).toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'short' 
  })} — ${new Date(story.endDate).toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'short',
    year: 'numeric'
  })}`

  return (
    <section className="min-h-screen w-full snap-start snap-always flex items-center justify-center relative overflow-hidden">
      {/* Textured background */}
      <div className="absolute inset-0 bg-gradient-to-br from-paper-kraft via-background to-washi-mint/20" />
      
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-32 h-8 bg-washi-pink/60 rotate-[-12deg]" />
      <div className="absolute top-20 right-20 w-24 h-6 bg-washi-mint/70 rotate-[8deg]" />
      <div className="absolute bottom-32 left-20 w-28 h-6 bg-washi-pink/50 rotate-[5deg]" />
      <div className="absolute bottom-20 right-32 w-20 h-5 bg-ink-green/30 rotate-[-8deg]" />
      
      {/* Scattered stamps */}
      <motion.div 
        className="absolute top-32 right-40 text-6xl opacity-20"
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        ✈️
      </motion.div>
      <motion.div 
        className="absolute bottom-40 left-40 text-5xl opacity-15"
        animate={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
      >
        🗺️
      </motion.div>

      <div className="relative z-10 text-center px-6 max-w-4xl">
        {/* Passport stamp style header */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 150, delay: 0.2 }}
        >
          <div className="inline-block mb-8 p-6 border-4 border-dashed border-stamp-red rounded-lg rotate-[-3deg]">
            <span className="text-stamp-red text-sm uppercase tracking-[0.3em] font-bold">
              Travel Journal
            </span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {isEditingTitle && isEditMode ? (
            <div className="flex items-center justify-center gap-3">
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                className="text-5xl md:text-7xl font-[family-name:var(--font-handwritten)] text-ink-green bg-transparent border-b-4 border-dashed border-ink-green/50 text-center focus:outline-none focus:border-ink-green"
                autoFocus
              />
              <Button size="icon" variant="ghost" onClick={handleSaveTitle}>
                <Check className="h-6 w-6 text-ink-green" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => { setIsEditingTitle(false); setTempTitle(story.title) }}>
                <X className="h-6 w-6 text-stamp-red" />
              </Button>
            </div>
          ) : (
            <h1 
              className={cn(
                "text-5xl md:text-7xl lg:text-8xl font-[family-name:var(--font-handwritten)] text-ink-green leading-tight",
                isEditMode && "cursor-pointer hover:opacity-80"
              )}
              onClick={() => isEditMode && setIsEditingTitle(true)}
            >
              {story.title}
            </h1>
          )}
        </motion.div>

        {/* Decorative underline */}
        <motion.svg 
          className="w-64 h-6 mx-auto mt-4 text-washi-pink"
          viewBox="0 0 256 24"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <path 
            d="M0 12 Q64 2, 128 12 T256 12" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="4"
            strokeLinecap="round"
          />
        </motion.svg>

        {/* Stats */}
        <motion.div 
          className="flex flex-wrap items-center justify-center gap-6 mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            {isEditMode && isEditingDates ? (
              <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-card px-4 py-3 shadow-sm ring-1 ring-border">
                <label className="flex flex-col text-xs text-muted-foreground">
                  Начало
                  <input
                    type="date"
                    value={tempStart}
                    onChange={(e) => setTempStart(e.target.value)}
                    className="mt-1 rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
                  />
                </label>
                <label className="flex flex-col text-xs text-muted-foreground">
                  Конец
                  <input
                    type="date"
                    value={tempEnd}
                    onChange={(e) => setTempEnd(e.target.value)}
                    className="mt-1 rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
                  />
                </label>
                <div className="flex gap-2 self-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (tempStart && tempEnd) {
                        updateStoryDates(tempStart, tempEnd)
                      }
                      setIsEditingDates(false)
                    }}
                  >
                    OK
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setTempStart(story.startDate)
                      setTempEnd(story.endDate)
                      setIsEditingDates(false)
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={!isEditMode}
                onClick={() => isEditMode && setIsEditingDates(true)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 bg-paper-cream rounded-full shadow-sm',
                  isEditMode && 'cursor-pointer hover:ring-2 hover:ring-ink-green/30'
                )}
              >
                <Calendar className="w-5 h-5 text-ink-green" />
                <span className="font-[family-name:var(--font-handwritten)] text-lg text-foreground">
                  {dateRange}
                </span>
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-paper-cream rounded-full shadow-sm">
            <MapPin className="w-5 h-5 text-stamp-red" />
            <span className="font-[family-name:var(--font-handwritten)] text-lg text-foreground">
              {story.totalLocations} {ruPlacesWord(story.totalLocations)}
            </span>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-paper-cream rounded-full shadow-sm">
            <Sparkles className="w-5 h-5 text-washi-pink" />
            <span className="font-[family-name:var(--font-handwritten)] text-lg text-foreground">
              {story.days.length} {ruDaysWord(story.days.length)}
            </span>
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div 
          className="mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-center gap-2 text-muted-foreground"
          >
            <span className="font-[family-name:var(--font-handwritten)] text-lg">
              Scroll to explore
            </span>
            <svg className="w-6 h-10" viewBox="0 0 24 40">
              <path 
                d="M12 0 L12 30 M6 24 L12 32 L18 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        </motion.div>
      </div>

    </section>
  )
}
