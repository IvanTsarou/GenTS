import type { TravelStory } from '@/lib/types/travel-story';

/** Пересчитывает totalLocations по текущим дням и локациям (поле в JSON часто устаревает). */
export function withSyncedMetrics(story: TravelStory): TravelStory {
  const totalLocations = story.days.reduce((acc, day) => acc + day.locations.length, 0);
  return {
    ...story,
    totalLocations,
  };
}
