'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type LocationRow = {
  id: string
  name: string | null
  lat: number | null
  lng: number | null
  photos_count?: number
}

type MediaRow = {
  id: string
  location_id: string | null
  file_url: string | null
  thumbnail_url: string | null
  shot_at: string | null
  created_at: string
  lat: number | null
  lng: number | null
  caption: string | null
}

async function parseJsonError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string }
    return j.error || `HTTP ${res.status}`
  } catch {
    return `HTTP ${res.status}`
  }
}

function authHeaders(): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' }
  const pub = process.env.NEXT_PUBLIC_STORY_EDIT_TOKEN
  if (pub) h['Authorization'] = `Bearer ${pub}`
  return h
}

export function CurateTripClient({ tripId, tripName }: { tripId: string; tripName: string }) {
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [media, setMedia] = useState<MediaRow[]>([])
  const [mediaFilter, setMediaFilter] = useState<'unassigned' | 'all'>('unassigned')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newLat, setNewLat] = useState('')
  const [newLng, setNewLng] = useState('')

  const [radius, setRadius] = useState('1000')
  const [reassignAll, setReassignAll] = useState(false)

  /** Последний отчёт автопривязки — показываем под кнопкой в блоке 2 */
  const [assignReport, setAssignReport] = useState<{
    assigned: number
    skippedNoCoords: number
    skippedNoMatch: number
    radiusMeters: number
    examined: number
  } | null>(null)

  /** Полноэкранный просмотр: в диалоге — оригинал (file_url), в таблице — крупнее превью */
  const [lightbox, setLightbox] = useState<{
    src: string
    meta: string
  } | null>(null)

  const showError = useCallback(async (res: Response, fallback: string) => {
    const msg = await parseJsonError(res)
    setStatus(msg || fallback)
  }, [])

  const refreshLocations = useCallback(async () => {
    const res = await fetch(`/api/trip/${tripId}/locations`, {
      cache: 'no-store',
    })
    if (!res.ok) {
      const msg = await parseJsonError(res)
      setStatus(`Локации: ${msg}`)
      return
    }
    const j = await res.json()
    setLocations(
      (j.locations || []).map((l: LocationRow & { photos_count?: number }) => ({
        id: l.id,
        name: l.name,
        lat: l.lat,
        lng: l.lng,
        photos_count: typeof l.photos_count === 'number' ? l.photos_count : 0,
      }))
    )
  }, [tripId])

  const refreshMedia = useCallback(async () => {
    const q = mediaFilter === 'unassigned' ? '?unassigned=1' : ''
    const res = await fetch(`/api/trip/${tripId}/media${q}`, {
      cache: 'no-store',
    })
    if (!res.ok) {
      const msg = await parseJsonError(res)
      setStatus(`Медиа: ${msg}`)
      return
    }
    const j = await res.json()
    setMedia(j.media || [])
  }, [tripId, mediaFilter])

  useEffect(() => {
    void refreshLocations()
  }, [refreshLocations])

  useEffect(() => {
    void refreshMedia()
  }, [refreshMedia])

  const unassignedCount = useMemo(
    () => media.filter((m) => m.location_id == null).length,
    [media]
  )

  const totalPhotosOnLocations = useMemo(
    () => locations.reduce((s, l) => s + (l.photos_count ?? 0), 0),
    [locations]
  )

  const seedNizwaFromKml = async () => {
    if (
      !confirm(
        'Удалить все локации этой поездки и загрузить маршрут Низва из KML?\n\nПривязка фото к старым локациям сбросится.'
      )
    ) {
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/trip/${tripId}/locations/seed-preset`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ preset: 'nizwa-itinerary' }),
      })
      if (!res.ok) {
        await showError(res, 'Импорт не выполнен')
        return
      }
      const j = (await res.json()) as { inserted?: number }
      setStatus(
        `Загружено локаций: ${j.inserted ?? 12}. Дальше: «Привязать фото к локациям» (радиус 1000 м).`
      )
      await refreshLocations()
      await refreshMedia()
    } finally {
      setBusy(false)
    }
  }

  const addLocation = async () => {
    setBusy(true)
    setStatus(null)
    try {
      const lat = parseFloat(newLat.replace(',', '.'))
      const lng = parseFloat(newLng.replace(',', '.'))
      const res = await fetch(`/api/trip/${tripId}/locations`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: newName.trim(), lat, lng }),
      })
      if (!res.ok) {
        await showError(res, 'Не удалось создать локацию')
        return
      }
      setNewName('')
      setNewLat('')
      setNewLng('')
      setStatus('Локация добавлена')
      await refreshLocations()
    } finally {
      setBusy(false)
    }
  }

  const deleteLocation = async (id: string) => {
    if (!confirm('Удалить локацию? Фото останутся в поездке без этой привязки (location_id станет пустым).')) return
    setBusy(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/trip/${tripId}/locations/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) {
        await showError(res, 'Не удалось удалить')
        return
      }
      setStatus('Локация удалена')
      await refreshLocations()
      await refreshMedia()
    } finally {
      setBusy(false)
    }
  }

  const runAutoAssign = async () => {
    setBusy(true)
    setStatus(null)
    try {
      const r = parseFloat(radius.replace(',', '.'))
      const res = await fetch(`/api/trip/${tripId}/media/auto-assign`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          radiusMeters: Number.isFinite(r) ? r : 1000,
          mode: reassignAll ? 'all_with_coords' : 'unassigned_only',
        }),
      })
      if (!res.ok) {
        await showError(res, 'Автопривязка не выполнена')
        return
      }
      const j = await res.json() as {
        assigned: number
        skippedNoCoords: number
        skippedNoMatch: number
        radiusMeters: number
        examined: number
      }
      setAssignReport({
        assigned: j.assigned,
        skippedNoCoords: j.skippedNoCoords,
        skippedNoMatch: j.skippedNoMatch,
        radiusMeters: j.radiusMeters,
        examined: j.examined,
      })
      setStatus(
        `Готово: привязано ${j.assigned}, без координат пропущено ${j.skippedNoCoords}, вне радиуса ${j.skippedNoMatch} (радиус ${j.radiusMeters} м).`
      )
      await refreshMedia()
      await refreshLocations()
    } finally {
      setBusy(false)
    }
  }

  const assignMedia = async (mediaId: string, locationId: string) => {
    setBusy(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/trip/${tripId}/media/${mediaId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ location_id: locationId || null }),
      })
      if (!res.ok) {
        await showError(res, 'Не удалось сохранить привязку')
        return
      }
      setStatus('Привязка обновлена')
      await refreshMedia()
      await refreshLocations()
    } finally {
      setBusy(false)
    }
  }

  const deleteMedia = async (mediaId: string) => {
    if (!confirm('Удалить фото из поездки и файлы в хранилище?')) return
    setBusy(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/trip/${tripId}/media/${mediaId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) {
        await showError(res, 'Не удалось удалить')
        return
      }
      setStatus('Медиа удалено')
      await refreshMedia()
      await refreshLocations()
    } finally {
      setBusy(false)
    }
  }

  const rebuildStory = async () => {
    setBusy(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/trip/${tripId}/travel-story/bootstrap?force=1`, {
        method: 'POST',
        headers: authHeaders(),
      })
      if (!res.ok) {
        await showError(res, 'Не удалось пересобрать историю')
        return
      }
      setStatus('Travel Story пересобрана из БД и записана в story_snapshot.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 pb-24">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Курация поездки</h1>
          <p className="text-muted-foreground">{tripName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/story/${tripId}`}>История (снапшот)</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/story/${tripId}?live=1`}>Предпросмотр из БД</Link>
          </Button>
        </div>
      </div>

      {status && (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm" role="status">
          {status}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>1. Локации</CardTitle>
          <CardDescription>Сначала создайте точки (название и координаты). Потом фото привяжутся по радиусу.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="loc-name">Название</Label>
              <Input id="loc-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Напр. Эрмитаж" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-lat">Широта</Label>
              <Input id="loc-lat" value={newLat} onChange={(e) => setNewLat(e.target.value)} placeholder="59.9398" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-lng">Долгота</Label>
              <Input id="loc-lng" value={newLng} onChange={(e) => setNewLng(e.target.value)} placeholder="30.3146" />
            </div>
          </div>
          <Button onClick={() => void addLocation()} disabled={busy || !newName.trim()}>
            Добавить локацию
          </Button>

          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
            <p className="mb-2 text-sm font-medium text-foreground">Импорт из KML</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Удаляет все текущие локации поездки и создаёт 12 точек из маршрута «Низва и горы» (файл{' '}
              <code className="rounded bg-muted px-1">nizwa_itinerary.kml</code>). У фото сбросится привязка к
              старым локациям — после импорта снова нажмите «Привязать фото к локациям».
            </p>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void seedNizwaFromKml()}
            >
              Заменить локации на маршрут Низва
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Колонка «Фото» — сколько медиа сейчас привязано к этой точке (обновляется после автопривязки и ручных правок).
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead className="w-16 text-center">Фото</TableHead>
                <TableHead>lat</TableHead>
                <TableHead>lng</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Пока нет локаций
                  </TableCell>
                </TableRow>
              ) : (
                locations.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-center tabular-nums">{l.photos_count ?? 0}</TableCell>
                    <TableCell>{l.lat ?? '—'}</TableCell>
                    <TableCell>{l.lng ?? '—'}</TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="sm" onClick={() => void deleteLocation(l.id)} disabled={busy}>
                        Удалить
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {locations.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              Всего фото с локацией: <strong className="text-foreground">{totalPhotosOnLocations}</strong>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Автопривязка фото по GPS</CardTitle>
          <CardDescription>
            Для каждого фото с координатами в БД выбирается ближайшая локация в пределах радиуса (по умолчанию 1000 м).
            После запуска смотрите отчёт ниже и колонку «Фото» в таблице локаций (раздел 1).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="radius">Радиус, м</Label>
              <Input id="radius" className="w-32" value={radius} onChange={(e) => setRadius(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox id="reall" checked={reassignAll} onCheckedChange={(c) => setReassignAll(c === true)} />
              <Label htmlFor="reall" className="text-sm font-normal leading-snug cursor-pointer">
                Пересчитать все фото с GPS (перезапишет текущую привязку)
              </Label>
            </div>
          </div>
          <Button onClick={() => void runAutoAssign()} disabled={busy || locations.length === 0}>
            Привязать фото к локациям
          </Button>
          {assignReport ? (
            <div
              className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm"
              role="status"
            >
              <p className="font-medium text-foreground">Результат последнего запуска</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                <li>
                  Привязано к локациям:{' '}
                  <strong className="text-foreground">{assignReport.assigned}</strong> (из рассмотренных:{' '}
                  {assignReport.examined})
                </li>
                <li>Пропущено без GPS в БД: {assignReport.skippedNoCoords}</li>
                <li>Не попало ни в один радиус {assignReport.radiusMeters} м: {assignReport.skippedNoMatch}</li>
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Сейчас всего фото с локацией (по таблице выше): {totalPhotosOnLocations}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Нажмите кнопку — здесь появится число привязанных кадров. Если <strong>привязано: 0</strong>, проверьте, что у
              фото в БД заполнены lat/lng и что радиус достаёт до локаций.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Ручная привязка и удаление</CardTitle>
          <CardDescription>
            Фото без локации после автопривязки — здесь. Переключите «Все фото», чтобы менять привязку или удалять любые
            кадры.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant={mediaFilter === 'unassigned' ? 'default' : 'outline'} size="sm" onClick={() => setMediaFilter('unassigned')}>
              Без локации ({unassignedCount})
            </Button>
            <Button variant={mediaFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setMediaFilter('all')}>
              Все фото
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[9.5rem] w-40">Превью</TableHead>
                <TableHead>Дата / координаты</TableHead>
                <TableHead>Локация</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {media.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    {mediaFilter === 'unassigned' ? 'Нет фото без локации' : 'Нет медиа'}
                  </TableCell>
                </TableRow>
              ) : (
                media.map((m) => (
                  <TableRow key={m.id} className="align-middle">
                    <TableCell className="py-3">
                      {(m.thumbnail_url || m.file_url) && (
                        <button
                          type="button"
                          className="group relative block shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border transition hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => {
                            const full = m.file_url || m.thumbnail_url
                            if (!full) return
                            const when = m.shot_at?.slice(0, 19) ?? m.created_at?.slice(0, 19)
                            const gps =
                              m.lat != null && m.lng != null
                                ? `${Number(m.lat).toFixed(5)}, ${Number(m.lng).toFixed(5)}`
                                : null
                            setLightbox({
                              src: full,
                              meta: [when, gps, m.caption?.trim() || null].filter(Boolean).join(' · '),
                            })
                          }}
                          title="Нажмите, чтобы увеличить"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={m.thumbnail_url || m.file_url || ''}
                            alt=""
                            className="h-28 w-28 sm:h-36 sm:w-36 object-cover"
                          />
                          <span className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/55 to-transparent pb-1.5 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100 sm:text-xs">
                            Увеличить
                          </span>
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] text-xs text-muted-foreground">
                      <div>{m.shot_at?.slice(0, 19) ?? m.created_at?.slice(0, 19)}</div>
                      <div>
                        {m.lat != null && m.lng != null
                          ? `${Number(m.lat).toFixed(5)}, ${Number(m.lng).toFixed(5)}`
                          : 'Нет GPS'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <select
                        className="w-full max-w-[220px] rounded-md border border-input bg-background px-2 py-2 text-sm"
                        value={m.location_id ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          void assignMedia(m.id, v)
                        }}
                        disabled={busy}
                      >
                        <option value="">— без локации —</option>
                        {locations.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name || l.id.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="destructive" size="sm" onClick={() => void deleteMedia(m.id)} disabled={busy}>
                        Удалить
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={lightbox != null}
        onOpenChange={(open) => {
          if (!open) setLightbox(null)
        }}
      >
        <DialogContent
          className="max-h-[95vh] max-w-[min(96vw,56rem)] gap-3 overflow-y-auto border-0 bg-background/95 p-3 shadow-2xl sm:p-4"
          showCloseButton
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Просмотр фото</DialogTitle>
            <DialogDescription>{lightbox?.meta}</DialogDescription>
          </DialogHeader>
          {lightbox && (
            <div className="flex flex-col gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.src}
                alt=""
                className="mx-auto max-h-[min(85vh,820px)] w-full max-w-full rounded-md object-contain bg-muted"
              />
              {lightbox.meta ? (
                <p className="text-center text-xs text-muted-foreground sm:text-sm">{lightbox.meta}</p>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>4. Пересборка Travel Story</CardTitle>
          <CardDescription>Записывает актуальную историю из БД в trips.story_snapshot (с перезаписью).</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void rebuildStory()} disabled={busy}>
            Пересобрать story_snapshot
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
