// One-off fix: the RU "Телефония и связь" service slug was manually
// edited in Studio to a human-readable value, but the EN counterpart
// was never updated, breaking the language switch on that page (404).
// Usage: node scripts/fix-telephony-slug.mjs
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from 'next-sanity'

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

const id = 'service-seed-en-5'
const newSlug = 'telephony-and-communications'
const doc = await client.getDocument(id)
if (!doc) {
  console.log(`${id} not found, nothing to do.`)
  process.exit(0)
}
await client.patch(id).set({ slug: { _type: 'slug', current: newSlug } }).commit()
console.log(`patched ${id} slug -> ${newSlug}`)
