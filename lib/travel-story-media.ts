import type { MediaItem } from '@/lib/types/travel-story'

export function sortMediaByOrder(media: MediaItem[]): MediaItem[] {
  return [...media].sort((a, b) => a.order - b.order)
}

/** Индекс слайда в отсортированном списке (для Embla startIndex). */
export function getMediaSlideIndex(media: MediaItem[], mediaId?: string | null): number {
  if (!mediaId) return 0
  const sorted = sortMediaByOrder(media)
  const i = sorted.findIndex((m) => m.id === mediaId)
  return i >= 0 ? i : 0
}
