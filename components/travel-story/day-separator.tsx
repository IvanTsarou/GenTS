'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditMode } from '@/hooks/use-edit-mode'
import { cn } from '@/lib/utils'
import { ruPlacesWord } from '@/lib/ru-plural'

interface DaySeparatorProps {
  dayId: string
  dayNumber: number
  date: string
  locationCount: number
}

export function DaySeparator({ dayId, dayNumber, date, locationCount }: DaySeparatorProps) {
  const { isEditMode, updateDayDate } = useEditMode()
  const [editingDate, setEditingDate] = useState(false)
  const [tempDate, setTempDate] = useState(date)

  useEffect(() => {
    setTempDate(date)
  }, [date])

  const formattedDate =
    date && !Number.isNaN(new Date(date).getTime())
      ? new Date(date).toLocaleDateString('ru-RU', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
      : date

  const placesLabel =
    locationCount > 0
      ? `${locationCount} ${ruPlacesWord(locationCount)}`
      : 'Без локаций'

  return (
    <div className="relative w-full px-4 py-5 md:px-6 md:py-6" role="separator" aria-label={`День ${dayNumber}`}>
      {/* Тонкая «лента» дня — не целый экран */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-ink-green/20 bg-gradient-to-r from-ink-green/95 via-ink-green to-ink-green/92 shadow-md ring-1 ring-black/5"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        {/* декор — короткие полоски васи */}
        <div className="pointer-events-none absolute -left-1 top-2 h-3 w-16 -rotate-6 rounded-sm bg-washi-pink/50" />
        <div className="pointer-events-none absolute -right-2 bottom-2 h-2.5 w-14 rotate-3 rounded-sm bg-washi-mint/45" />

        <div className="relative z-10 flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-[3px] border-double border-paper-cream/75 bg-paper-cream/10 sm:h-16 sm:w-16">
              <span className="text-[0.55rem] font-bold uppercase tracking-[0.2em] text-paper-cream/70">
                День
              </span>
              <span className="font-[family-name:var(--font-handwritten)] text-2xl font-bold leading-none text-paper-cream sm:text-3xl">
                {dayNumber}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              {isEditMode && editingDate && dayId ? (
                <div className="flex flex-col gap-2 rounded-xl bg-paper-cream/12 p-2 backdrop-blur-sm sm:flex-row sm:items-center">
                  <label className="flex items-center gap-2 text-xs text-paper-cream/90">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <input
                      type="date"
                      value={tempDate}
                      onChange={(e) => setTempDate(e.target.value)}
                      className="w-full max-w-[11rem] rounded border border-paper-cream/40 bg-paper-cream/95 px-2 py-1.5 text-sm text-ink-green"
                    />
                  </label>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs"
                      onClick={() => {
                        if (tempDate) updateDayDate(dayId, tempDate)
                        setEditingDate(false)
                      }}
                    >
                      OK
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-paper-cream hover:bg-paper-cream/15"
                      onClick={() => {
                        setTempDate(date)
                        setEditingDate(false)
                      }}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <p
                  onClick={() => {
                    if (isEditMode && dayId) {
                      setTempDate(date)
                      setEditingDate(true)
                    }
                  }}
                  className={cn(
                    'text-base font-medium capitalize leading-snug text-paper-cream/95 sm:text-lg md:max-w-md',
                    'font-[family-name:var(--font-handwritten)]',
                    isEditMode && dayId && 'cursor-pointer rounded-lg ring-2 ring-transparent hover:ring-paper-cream/35'
                  )}
                >
                  {formattedDate}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-paper-cream/15 pt-2 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
            <span className="text-sm text-paper-cream/85 sm:text-[0.95rem]">
              {placesLabel}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
