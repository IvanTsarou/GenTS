/**
 * Тосты без статического import('sonner') — иначе Next иногда рвёт vendor-chunks
 * (Cannot find module './vendor-chunks/sonner.js') после частичной пересборки .next
 */
export function storyToastSuccess(message: string): void {
  if (typeof window === 'undefined') return
  void import('sonner').then(({ toast }) => toast.success(message))
}

export function storyToastError(message: string): void {
  if (typeof window === 'undefined') return
  void import('sonner').then(({ toast }) => toast.error(message))
}
