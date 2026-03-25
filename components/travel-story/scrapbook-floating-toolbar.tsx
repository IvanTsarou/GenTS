'use client'

import { useState } from 'react'
import { Pencil, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditMode } from '@/hooks/use-edit-mode'
import { ShareModal } from './share-modal'
import { cn } from '@/lib/utils'

/**
 * Закреплённая панель: редактирование и шаринг при прокрутке альбома.
 */
export function ScrapbookFloatingToolbar() {
  const { story, isEditMode, toggleEditMode } = useEditMode()
  const [shareOpen, setShareOpen] = useState(false)

  if (!story) return null

  return (
    <>
      <div
        className={cn(
          'fixed right-4 top-4 z-[100] flex flex-wrap items-center justify-end gap-2',
          'max-w-[calc(100vw-2rem)]'
        )}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
          <Button
            type="button"
            variant={isEditMode ? 'default' : 'outline'}
            size="sm"
            onClick={toggleEditMode}
            className={cn(
              'rounded-full shadow-md backdrop-blur-sm bg-background/95',
              isEditMode && 'bg-ink-green text-primary-foreground hover:bg-ink-green/90'
            )}
          >
            <Pencil className="mr-1.5 h-4 w-4" />
            {isEditMode ? 'Редактирование' : 'Редактировать'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShareOpen(true)}
            className="rounded-full bg-background/95 shadow-md backdrop-blur-sm"
          >
            <Share2 className="mr-1.5 h-4 w-4" />
            Поделиться
          </Button>
      </div>

      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  )
}
