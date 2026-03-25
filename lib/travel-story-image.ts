/** Единые настройки Next/Image для travel story — чёткость на Retina */
export const STORY_IMAGE_QUALITY = 95

/** Polaroid: реальная ширина на экране больше layout width из‑за DPR */
export const POLAROID_SIZES = {
  tiny: '(max-width: 640px) 45vw, 220px',
  small: '(max-width: 640px) 55vw, 360px',
  large: '(max-width: 768px) 92vw, (max-width: 1280px) 48vw, 720px',
} as const

/** Сетка галереи (2–4 колонки) */
export const GALLERY_GRID_SIZES =
  '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'

/** Стабильный ключ по содержимому медиа (не по ссылке на массив) */
export function mediaListSyncKey(media: { id: string; order: number }[]): string {
  return media.map((m) => `${m.id}:${m.order}`).join('|')
}
