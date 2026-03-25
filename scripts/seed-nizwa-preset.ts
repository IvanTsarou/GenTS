/**
 * Одноразовый импорт локаций Низва в Supabase без запущенного Next.
 * Использование:
 *   npx tsx scripts/seed-nizwa-preset.ts <trip_uuid>
 *
 * Читает SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY из .env.local
 */
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { NIZWA_ITINERARY_LOCATIONS } from '../lib/presets/nizwa-itinerary-locations'

function loadEnvLocal() {
  const p = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(p)) {
    console.error('Нет .env.local')
    process.exit(1)
  }
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  }
}

async function main() {
  loadEnvLocal()
  const tripId = process.argv[2]
  if (!tripId || !/^[0-9a-f-]{36}$/i.test(tripId)) {
    console.error('Укажите UUID поездки: npx tsx scripts/seed-nizwa-preset.ts <trip_uuid>')
    process.exit(1)
  }
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Нужны SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local')
    process.exit(1)
  }

  const sb = createClient(url, key)

  const { error: dErr } = await sb.from('locations').delete().eq('trip_id', tripId)
  if (dErr) {
    console.error('delete:', dErr.message)
    process.exit(1)
  }

  const rows = NIZWA_ITINERARY_LOCATIONS.map((l) => ({
    trip_id: tripId,
    name: l.name,
    lat: l.lat,
    lng: l.lng,
    description: l.description ?? null,
  }))

  const { data, error: iErr } = await sb.from('locations').insert(rows).select('id')
  if (iErr) {
    console.error('insert:', iErr.message)
    process.exit(1)
  }

  console.log('OK, вставлено локаций:', data?.length ?? rows.length)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
