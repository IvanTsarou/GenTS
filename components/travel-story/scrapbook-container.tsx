'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useEditMode } from '@/hooks/use-edit-mode'
import { ScrapbookHeader } from './scrapbook-header'
import { ScrapbookPage } from './scrapbook-page'
import { DaySeparator } from './day-separator'
import { cn } from '@/lib/utils'

export function ScrapbookContainer() {
  const { story } = useEditMode()
  const containerRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])
  const [currentSection, setCurrentSection] = useState(0)
  const [totalSections, setTotalSections] = useState(0)

  const sections = story ? buildSections(story) : []

  useEffect(() => {
    setTotalSections(sections.length)
    sectionRefs.current = sectionRefs.current.slice(0, sections.length)
  }, [sections.length])

  const updateCurrentFromScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const cRect = container.getBoundingClientRect()
    const anchorY = cRect.top + container.clientHeight * 0.22

    let bestIdx = 0
    let bestDist = Infinity

    sectionRefs.current.forEach((el, i) => {
      if (!el) return
      const r = el.getBoundingClientRect()
      const center = r.top + r.height / 2
      const dist = Math.abs(center - anchorY)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    })

    setCurrentSection(bestIdx)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('scroll', updateCurrentFromScroll, { passive: true })
    window.addEventListener('resize', updateCurrentFromScroll)
    const id = requestAnimationFrame(() => updateCurrentFromScroll())

    return () => {
      container.removeEventListener('scroll', updateCurrentFromScroll)
      window.removeEventListener('resize', updateCurrentFromScroll)
      cancelAnimationFrame(id)
    }
  }, [updateCurrentFromScroll, sections.length])

  const scrollToSection = (index: number) => {
    const container = containerRef.current
    const el = sectionRefs.current[index]
    if (!container || !el) return

    const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
    container.scrollTo({
      top: Math.max(0, top),
      behavior: 'smooth',
    })
  }

  if (!story) return null

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-screen snap-y snap-proximity overflow-y-auto scroll-smooth"
      >
        {sections.map((section, idx) => (
          <div
            key={sectionKey(section, idx)}
            ref={(el) => {
              sectionRefs.current[idx] = el
            }}
            className="w-full snap-start snap-always"
          >
            {section.type === 'header' && <ScrapbookHeader />}

            {section.type === 'day' && (
              <DaySeparator
                dayId={section.dayId ?? ''}
                dayNumber={section.dayNumber ?? 1}
                date={section.date ?? ''}
                locationCount={section.locationCount ?? 0}
              />
            )}

            {section.type === 'location' && (
              <ScrapbookPage
                location={section.location}
                dayNumber={section.dayNumber ?? 1}
                locationIndex={section.globalIndex ?? 0}
                totalLocations={section.totalLocations ?? 0}
                nextTransport={section.nextTransport}
                isActive={currentSection === idx}
              />
            )}
          </div>
        ))}
      </div>

      <div className="fixed right-4 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-2">
        {sections.map((section, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => scrollToSection(idx)}
            className={cn(
              'transition-all duration-300',
              section.type === 'header' && 'h-3 w-3 rounded-full',
              section.type === 'day' && 'h-1.5 w-4 rounded-full',
              section.type === 'location' && 'h-2 w-2 rounded-full',
              currentSection === idx
                ? 'scale-125 bg-ink-green'
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            )}
            title={
              section.type === 'location'
                ? section.location.name
                : section.type === 'day'
                  ? `День ${section.dayNumber}`
                  : undefined
            }
          />
        ))}
      </div>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {currentSection > 0 && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scrollToSection(currentSection - 1)}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-paper-cream shadow-lg transition-colors hover:bg-white"
            >
              <ChevronUp className="h-6 w-6 text-ink-green" />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {currentSection < totalSections - 1 && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scrollToSection(currentSection + 1)}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-paper-cream shadow-lg transition-colors hover:bg-white"
            >
              <ChevronDown className="h-6 w-6 text-ink-green" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-6 left-6 z-50 rounded-full border border-border bg-paper-cream/90 px-4 py-2 shadow-lg backdrop-blur-sm">
        <span className="font-[family-name:var(--font-handwritten)] text-lg text-ink-green">
          {currentSection + 1} / {totalSections}
        </span>
      </div>
    </div>
  )
}

interface Section {
  type: 'header' | 'day' | 'location'
  dayId?: string
  dayNumber?: number
  date?: string
  locationCount?: number
  location?: any
  globalIndex?: number
  totalLocations?: number
  nextTransport?: any
}

function sectionKey(section: Section, idx: number): string {
  if (section.type === 'header') return 'header'
  if (section.type === 'day') {
    return section.dayId ?? `day-${section.date}-${section.dayNumber}-${idx}`
  }
  return `location-${section.location?.id ?? idx}`
}

function buildSections(story: any): Section[] {
  const sections: Section[] = [{ type: 'header' }]

  let globalLocationIndex = 0
  const totalLocations = story.days.reduce((acc: number, day: any) => acc + day.locations.length, 0)

  story.days.forEach((day: any, dayIdx: number) => {
    sections.push({
      type: 'day',
      dayId: day.id,
      dayNumber: day.dayNumber,
      date: day.date,
      locationCount: day.locations.length,
    })

    day.locations.forEach((location: any, locIdx: number) => {
      const nextLocation = day.locations[locIdx + 1] || story.days[dayIdx + 1]?.locations[0]

      sections.push({
        type: 'location',
        location,
        dayNumber: day.dayNumber,
        globalIndex: globalLocationIndex,
        totalLocations,
        nextTransport: nextLocation?.transportFrom?.type,
      })

      globalLocationIndex++
    })
  })

  return sections
}
