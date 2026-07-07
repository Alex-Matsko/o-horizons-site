// Patches detailed content (audience/problems/included/result) onto the
// seeded service docs without touching titles or owner-edited slugs.
// Usage: node scripts/seed-service-details.mjs
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from 'next-sanity'
import { serviceDetails } from './service-details.mjs'

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvLocal() {
  const envPath = path.join(siteDir, '.env.local')
  const env = {}
  if (!existsSync(envPath)) return env
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
  }
  return env
}

const env = { ...loadEnvLocal(), ...process.env }
if (!env.NEXT_PUBLIC_SANITY_PROJECT_ID || !env.SANITY_WRITE_TOKEN) {
  console.log('Sanity is not configured for writing. Nothing to do.')
  process.exit(0)
}

const client = createClient({
  projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

for (const locale of ['ru', 'en']) {
  const details = serviceDetails[locale]
  for (let i = 0; i < details.length; i++) {
    const id = `service-seed-${locale}-${i}`
    await client.patch(id).set(details[i]).commit()
    console.log(`patched ${id}`)
  }
}
console.log('done')
