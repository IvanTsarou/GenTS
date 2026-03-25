'use client'

import { EditModeProvider } from '@/hooks/use-edit-mode'
import { ScrapbookContainer } from '@/components/travel-story/scrapbook-container'
import { ScrapbookFloatingToolbar } from '@/components/travel-story/scrapbook-floating-toolbar'
import { EditBar } from '@/components/travel-story/edit-bar'
import type { TravelStory } from '@/lib/types/travel-story'

export function TravelStoryView({
  initialStory,
  tripId,
}: {
  initialStory: TravelStory
  tripId: string
}) {
  return (
    <EditModeProvider initialStory={initialStory} tripId={tripId}>
      <ScrapbookFloatingToolbar />
      <ScrapbookContainer />
      <EditBar />
    </EditModeProvider>
  )
}
