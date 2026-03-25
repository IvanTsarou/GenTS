'use client'

import { useMemo, useState } from 'react'
import { FolderInput } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useEditMode } from '@/hooks/use-edit-mode'
import { cn } from '@/lib/utils'

type MediaMoveToLocationProps = {
  /** Текущая локация медиа */
  fromLocationId: string
  mediaId: string
  /** Вариант кнопки */
  variant?: 'icon' | 'compact'
  className?: string
  /** После переноса (например закрыть лайтбокс) */
  onMoved?: () => void
}

/**
 * Кнопка + поисковый список: перенести медиа в другую локацию (любой день).
 */
export function MediaMoveToLocation({
  fromLocationId,
  mediaId,
  variant = 'icon',
  className,
  onMoved,
}: MediaMoveToLocationProps) {
  const { story, moveMediaToLocation } = useEditMode()
  const [open, setOpen] = useState(false)

  const options = useMemo(() => {
    if (!story) return []
    const out: { id: string; label: string; dayNumber: number }[] = []
    for (const day of story.days) {
      for (const loc of day.locations) {
        if (loc.id === fromLocationId) continue
        out.push({
          id: loc.id,
          label: loc.name,
          dayNumber: day.dayNumber,
        })
      }
    }
    return out.sort((a, b) => {
      if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber
      return a.label.localeCompare(b.label, 'ru')
    })
  }, [story, fromLocationId])

  const handlePick = (toLocationId: string) => {
    moveMediaToLocation(fromLocationId, mediaId, toLocationId)
    setOpen(false)
    onMoved?.()
  }

  if (options.length === 0) {
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size={variant === 'icon' ? 'icon' : 'sm'}
          className={cn(
            variant === 'icon' ? 'h-7 w-7 shrink-0 rounded-full p-0' : 'h-8 gap-1 px-2 text-xs',
            className
          )}
          title="Перенести в другую локацию"
          aria-label="Перенести в другую локацию"
          onClick={(e) => e.stopPropagation()}
        >
          <FolderInput className={cn(variant === 'icon' ? 'h-3.5 w-3.5' : 'h-3.5 w-3.5')} />
          {variant === 'compact' ? <span>В локацию</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="start" onClick={(e) => e.stopPropagation()}>
        <Command shouldFilter>
          <CommandInput placeholder="Поиск локации…" className="h-9" />
          <CommandList>
            <CommandEmpty>Нет других локаций</CommandEmpty>
            <CommandGroup heading="Куда перенести">
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`${o.label} день ${o.dayNumber}`}
                  onSelect={() => handlePick(o.id)}
                >
                  <span className="truncate">
                    <span className="text-muted-foreground">День {o.dayNumber}</span>
                    {' · '}
                    {o.label}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
