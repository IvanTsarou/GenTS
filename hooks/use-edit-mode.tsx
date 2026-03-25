'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import { storyToastError, storyToastSuccess } from '@/lib/story-toast'
import type { TravelStory, TransportType, MediaItem } from '@/lib/types/travel-story'
import { withSyncedMetrics } from '@/lib/travel-story-metrics'

interface EditModeContextType {
  isEditMode: boolean
  toggleEditMode: () => void
  hasUnsavedChanges: boolean
  updateStoryTitle: (title: string) => void
  updateLocationDescription: (locationId: string, description: string) => void
  updateLocationName: (locationId: string, name: string) => void
  /** Подпись и URL источника описания (Wikipedia и т.п.) */
  updateLocationSource: (
    locationId: string,
    sourceDescription: string,
    sourceUrl: string
  ) => void
  updateTransportType: (locationId: string, type: TransportType) => void
  updateTransportDuration: (locationId: string, duration: string) => void
  updateMediaCaption: (mediaId: string, caption: string) => void
  reorderMedia: (locationId: string, mediaIds: string[]) => void
  deleteMedia: (locationId: string, mediaId: string) => void
  /** Перенос файла в другую локацию (в т.ч. другой день) */
  moveMediaToLocation: (fromLocationId: string, mediaId: string, toLocationId: string) => void
  updateComment: (commentId: string, text: string) => void
  /** Диапазон дат на обложке (не обязан совпадать с днями — для подписи) */
  updateStoryDates: (startDate: string, endDate: string) => void
  /** Дата конкретного дня; пересчитывает порядок дней и start/end поездки */
  updateDayDate: (dayId: string, newDate: string) => void
  saveChanges: () => Promise<void>
  discardChanges: () => void
  story: TravelStory | null
  setStory: (story: TravelStory) => void
}

const EditModeContext = createContext<EditModeContextType | null>(null)

export function EditModeProvider({
  children,
  initialStory,
  tripId,
}: {
  children: ReactNode
  initialStory: TravelStory
  /** UUID из БД или `demo` для демо без сохранения */
  tripId: string
}) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [story, setStory] = useState<TravelStory>(() => withSyncedMetrics(initialStory))
  const [originalStory, setOriginalStory] = useState<TravelStory>(() => withSyncedMetrics(initialStory))
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const storyDisplay = useMemo(() => withSyncedMetrics(story), [story])

  const setStoryNormalized = useCallback((next: TravelStory) => {
    setStory(withSyncedMetrics(next))
  }, [])

  const toggleEditMode = useCallback(() => {
    if (isEditMode && hasUnsavedChanges) {
      return
    }
    setIsEditMode(prev => !prev)
    if (!isEditMode) {
      setOriginalStory(withSyncedMetrics(story))
    }
  }, [isEditMode, hasUnsavedChanges, story])

  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true)
  }, [])

  const findLocation = useCallback((locationId: string): { dayIndex: number; locIndex: number } | null => {
    for (let dayIndex = 0; dayIndex < story.days.length; dayIndex++) {
      const locIndex = story.days[dayIndex].locations.findIndex(l => l.id === locationId)
      if (locIndex !== -1) {
        return { dayIndex, locIndex }
      }
    }
    return null
  }, [story])

  const updateStoryTitle = useCallback((title: string) => {
    setStory(prev => ({ ...prev, title }))
    markAsChanged()
  }, [markAsChanged])

  const updateLocationDescription = useCallback((locationId: string, description: string) => {
    const indices = findLocation(locationId)
    if (!indices) return

    setStory(prev => {
      const newDays = [...prev.days]
      const newLocations = [...newDays[indices.dayIndex].locations]
      newLocations[indices.locIndex] = { ...newLocations[indices.locIndex], description }
      newDays[indices.dayIndex] = { ...newDays[indices.dayIndex], locations: newLocations }
      return { ...prev, days: newDays }
    })
    markAsChanged()
  }, [findLocation, markAsChanged])

  const updateLocationName = useCallback((locationId: string, name: string) => {
    const indices = findLocation(locationId)
    if (!indices) return

    setStory(prev => {
      const newDays = [...prev.days]
      const newLocations = [...newDays[indices.dayIndex].locations]
      newLocations[indices.locIndex] = { ...newLocations[indices.locIndex], name }
      newDays[indices.dayIndex] = { ...newDays[indices.dayIndex], locations: newLocations }
      return { ...prev, days: newDays }
    })
    markAsChanged()
  }, [findLocation, markAsChanged])

  const updateLocationSource = useCallback(
    (locationId: string, sourceDescription: string, sourceUrl: string) => {
      const indices = findLocation(locationId)
      if (!indices) return

      const desc = sourceDescription.trim()
      const url = sourceUrl.trim()

      setStory((prev) => {
        const newDays = [...prev.days]
        const newLocations = [...newDays[indices.dayIndex].locations]
        const loc = newLocations[indices.locIndex]
        newLocations[indices.locIndex] = {
          ...loc,
          sourceDescription: desc || undefined,
          sourceUrl: url || undefined,
        }
        newDays[indices.dayIndex] = { ...newDays[indices.dayIndex], locations: newLocations }
        return { ...prev, days: newDays }
      })
      markAsChanged()
    },
    [findLocation, markAsChanged]
  )

  const updateTransportType = useCallback((locationId: string, type: TransportType) => {
    const indices = findLocation(locationId)
    if (!indices) return

    setStory(prev => {
      const newDays = [...prev.days]
      const newLocations = [...newDays[indices.dayIndex].locations]
      const location = newLocations[indices.locIndex]
      newLocations[indices.locIndex] = { 
        ...location, 
        transportFrom: location.transportFrom 
          ? { ...location.transportFrom, type } 
          : { type }
      }
      newDays[indices.dayIndex] = { ...newDays[indices.dayIndex], locations: newLocations }
      return { ...prev, days: newDays }
    })
    markAsChanged()
  }, [findLocation, markAsChanged])

  const updateTransportDuration = useCallback((locationId: string, duration: string) => {
    const indices = findLocation(locationId)
    if (!indices) return

    setStory(prev => {
      const newDays = [...prev.days]
      const newLocations = [...newDays[indices.dayIndex].locations]
      const location = newLocations[indices.locIndex]
      if (location.transportFrom) {
        newLocations[indices.locIndex] = { 
          ...location, 
          transportFrom: { ...location.transportFrom, duration }
        }
        newDays[indices.dayIndex] = { ...newDays[indices.dayIndex], locations: newLocations }
      }
      return { ...prev, days: newDays }
    })
    markAsChanged()
  }, [findLocation, markAsChanged])

  const updateMediaCaption = useCallback((mediaId: string, caption: string) => {
    setStory(prev => {
      const newDays = prev.days.map(day => ({
        ...day,
        locations: day.locations.map(loc => ({
          ...loc,
          media: loc.media.map(m => m.id === mediaId ? { ...m, caption } : m)
        }))
      }))
      return { ...prev, days: newDays }
    })
    markAsChanged()
  }, [markAsChanged])

  const reorderMedia = useCallback((locationId: string, mediaIds: string[]) => {
    const indices = findLocation(locationId)
    if (!indices) return

    setStory(prev => {
      const newDays = [...prev.days]
      const newLocations = [...newDays[indices.dayIndex].locations]
      const location = newLocations[indices.locIndex]
      
      const reorderedMedia = mediaIds.map((id, index) => {
        const media = location.media.find(m => m.id === id)!
        return { ...media, order: index }
      })
      
      newLocations[indices.locIndex] = { ...location, media: reorderedMedia }
      newDays[indices.dayIndex] = { ...newDays[indices.dayIndex], locations: newLocations }
      return { ...prev, days: newDays }
    })
    markAsChanged()
  }, [findLocation, markAsChanged])

  const deleteMedia = useCallback((locationId: string, mediaId: string) => {
    const indices = findLocation(locationId)
    if (!indices) return

    setStory(prev => {
      const newDays = [...prev.days]
      const newLocations = [...newDays[indices.dayIndex].locations]
      const location = newLocations[indices.locIndex]
      
      newLocations[indices.locIndex] = { 
        ...location, 
        media: location.media.filter(m => m.id !== mediaId)
      }
      newDays[indices.dayIndex] = { ...newDays[indices.dayIndex], locations: newLocations }
      return { ...prev, days: newDays }
    })
    markAsChanged()
  }, [findLocation, markAsChanged])

  const moveMediaToLocation = useCallback(
    (fromLocationId: string, mediaId: string, toLocationId: string) => {
      if (fromLocationId === toLocationId) return

      setStory((prev) => {
        let extracted: MediaItem | null = null

        const daysAfterRemove = prev.days.map((day) => ({
          ...day,
          locations: day.locations.map((loc) => {
            if (loc.id !== fromLocationId) return loc
            const found = loc.media.find((m) => m.id === mediaId)
            if (!found) return loc
            extracted = found
            const filtered = loc.media.filter((m) => m.id !== mediaId)
            return {
              ...loc,
              media: filtered.map((item, i) => ({ ...item, order: i })),
            }
          }),
        }))

        if (!extracted) return prev

        const daysAfterAdd = daysAfterRemove.map((day) => ({
          ...day,
          locations: day.locations.map((loc) => {
            if (loc.id !== toLocationId) return loc
            const maxOrder =
              loc.media.length === 0
                ? -1
                : Math.max(...loc.media.map((m) => m.order))
            return {
              ...loc,
              media: [...loc.media, { ...extracted!, order: maxOrder + 1 }],
            }
          }),
        }))

        return { ...prev, days: daysAfterAdd }
      })
      markAsChanged()
    },
    [markAsChanged]
  )

  const updateComment = useCallback((commentId: string, text: string) => {
    setStory(prev => {
      const newDays = prev.days.map(day => ({
        ...day,
        locations: day.locations.map(loc => ({
          ...loc,
          comments: loc.comments.map(c => c.id === commentId ? { ...c, text } : c)
        }))
      }))
      return { ...prev, days: newDays }
    })
    markAsChanged()
  }, [markAsChanged])

  const updateStoryDates = useCallback(
    (startDate: string, endDate: string) => {
      setStory((prev) => ({ ...prev, startDate, endDate }))
      markAsChanged()
    },
    [markAsChanged]
  )

  const updateDayDate = useCallback(
    (dayId: string, newDate: string) => {
      setStory((prev) => {
        const nextDays = prev.days.map((d) =>
          d.id === dayId ? { ...d, id: `day-${newDate}`, date: newDate } : d
        )
        const sorted = [...nextDays].sort((a, b) => a.date.localeCompare(b.date))
        const renumbered = sorted.map((d, i) => ({ ...d, dayNumber: i + 1 }))
        const dates = renumbered.map((d) => d.date).sort()
        return {
          ...prev,
          days: renumbered,
          startDate: dates[0] ?? prev.startDate,
          endDate: dates[dates.length - 1] ?? prev.endDate,
        }
      })
      markAsChanged()
    },
    [markAsChanged]
  )

  const saveChanges = useCallback(async () => {
    if (tripId === 'demo') {
      setOriginalStory(withSyncedMetrics(story))
      setHasUnsavedChanges(false)
      setIsEditMode(false)
      storyToastSuccess('Демо: изменения только в браузере')
      return
    }

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      const pub = process.env.NEXT_PUBLIC_STORY_EDIT_TOKEN
      if (pub) {
        headers['Authorization'] = `Bearer ${pub}`
      }

      const payload = withSyncedMetrics(story)

      const res = await fetch(`/api/trip/${tripId}/travel-story`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error || res.statusText)
      }

      const saved = withSyncedMetrics((await res.json()) as TravelStory)
      setStory(saved)
      setOriginalStory(saved)
      setHasUnsavedChanges(false)
      setIsEditMode(false)
      storyToastSuccess('История сохранена')
    } catch (e) {
      storyToastError(e instanceof Error ? e.message : 'Не удалось сохранить')
    }
  }, [tripId, story])

  const discardChanges = useCallback(() => {
    setStory(withSyncedMetrics(originalStory))
    setHasUnsavedChanges(false)
    setIsEditMode(false)
  }, [originalStory])

  const value: EditModeContextType = {
    isEditMode,
    toggleEditMode,
    hasUnsavedChanges,
    updateStoryTitle,
    updateLocationDescription,
    updateLocationName,
    updateLocationSource,
    updateTransportType,
    updateTransportDuration,
    updateMediaCaption,
    reorderMedia,
    deleteMedia,
    moveMediaToLocation,
    updateComment,
    updateStoryDates,
    updateDayDate,
    saveChanges,
    discardChanges,
    story: storyDisplay,
    setStory: setStoryNormalized
  }

  return (
    <EditModeContext.Provider value={value}>
      {children}
    </EditModeContext.Provider>
  )
}

export function useEditMode() {
  const context = useContext(EditModeContext)
  if (!context) {
    throw new Error('useEditMode must be used within EditModeProvider')
  }
  return context
}
