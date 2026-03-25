import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

function loadEnvLocal() {
  const p = path.join(process.cwd(), '.env.local')
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
}

async function main() {
  loadEnvLocal()
  const tripId = process.argv[2] || '0f2aca21-9b45-4c69-92d0-103086e83baf'
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await sb
    .from('locations')
    .select('id,name,lat,lng')
    .eq('trip_id', tripId)
    .order('created_at')
  if (error) throw error
  console.log('trip', tripId, 'locations count:', data?.length ?? 0)
  data?.forEach((r, i) => console.log(i + 1, r.name, r.lat, r.lng))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
