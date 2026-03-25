'use client'

/* Намеренно нативный <img> — Next/Image режет по sizes и даёт мыло на Retina для Storage URL. */
/* eslint-disable @next/next/no-img-element */

import { cn } from '@/lib/utils'

type Layout = 'fill-contain' | 'fill-cover' | 'responsive-contain'

type TravelMediaImageProps = {
  src: string
  alt: string
  layout: Layout
  className?: string
  /** Для layout responsive-contain: ограничение по высоте (tailwind-классы) */
  maxHeightClass?: string
}

/**
 * Фото из Storage без pipeline Next/Image — иначе часто даёт мыльную картинку
 * (ресайз меньше реального отображения на Retina).
 */
export function TravelMediaImage({
  src,
  alt,
  layout,
  className,
  maxHeightClass = 'max-h-[85vh]',
}: TravelMediaImageProps) {
  if (!src) return null

  /* Яркость/контраст слегка поднимаем — без transform на родителе (он даёт мыло на Retina) */
  const base =
    'select-none [image-rendering:auto] contrast-[1.03] saturate-[1.04] brightness-[1.01]'

  if (layout === 'fill-contain') {
    return (
      <img
        src={src}
        alt={alt}
        className={cn(base, 'absolute inset-0 h-full w-full object-contain', className)}
        decoding="async"
        draggable={false}
      />
    )
  }

  if (layout === 'fill-cover') {
    return (
      <img
        src={src}
        alt={alt}
        className={cn(base, 'absolute inset-0 h-full w-full object-cover', className)}
        decoding="async"
        draggable={false}
      />
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn(base, 'h-auto w-auto max-w-[min(92vw,1600px)] object-contain', maxHeightClass, className)}
      decoding="async"
      draggable={false}
    />
  )
}
