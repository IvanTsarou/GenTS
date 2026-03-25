import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTravelStoryByTripId } from '@/lib/get-travel-story'
import { mockTravelStory } from '@/lib/mock-data'
import { TravelStoryView } from './travel-story-view'
import { TravelStoryLiveLoader } from './travel-story-live-loader'

export const dynamic = 'force-dynamic'

export default async function StoryPage({
  params,
  searchParams,
}: {
  params: { tripId: string }
  searchParams?: { live?: string | string[] }
}) {
  const { tripId } = params
  const liveRaw = searchParams?.live
  const live = liveRaw === '1' || (Array.isArray(liveRaw) && liveRaw.includes('1'))

  if (tripId === 'demo') {
    return (
      <div>
        <div className="fixed left-4 top-4 z-50">
          <Link
            href="/"
            className="rounded-full bg-card/90 px-4 py-2 text-sm font-medium text-foreground shadow-md ring-1 ring-border backdrop-blur"
          >
            ← На главную
          </Link>
        </div>
        <TravelStoryView initialStory={mockTravelStory} tripId="demo" />
      </div>
    )
  }

  if (live) {
    return (
      <div>
        <div className="fixed left-4 top-4 z-50">
          <Link
            href="/"
            className="rounded-full bg-card/90 px-4 py-2 text-sm font-medium text-foreground shadow-md ring-1 ring-border backdrop-blur"
          >
            ← На главную
          </Link>
        </div>
        <TravelStoryLiveLoader tripId={tripId} />
      </div>
    )
  }

  const story = await getTravelStoryByTripId(tripId)
  if (!story) {
    notFound()
  }

  return (
    <div>
      <div className="fixed left-4 top-4 z-50">
        <Link
          href="/"
          className="rounded-full bg-card/90 px-4 py-2 text-sm font-medium text-foreground shadow-md ring-1 ring-border backdrop-blur"
        >
          ← На главную
        </Link>
      </div>
      <TravelStoryView initialStory={story} tripId={tripId} />
    </div>
  )
}
