// Seeds the six illustrative case studies from case-studies.mjs into Sanity.
// Idempotent: uses deterministic IDs and createOrReplace, safe to re-run.
// Usage: node scripts/seed-case-studies.mjs
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from 'next-sanity'
import { caseStudies } from './case-studies.mjs'

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

let keyCounter = 0
const nextKey = () => `k${keyCounter++}`

function toBlocks(items) {
  return items.map(item => ({
    _type: 'block',
    _key: nextKey(),
    style: item.type === 'h3' ? 'h3' : 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: nextKey(), text: item.text, marks: [] }],
  }))
}

for (const locale of ['ru', 'en']) {
  const cases = caseStudies[locale]
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i]
    const id = `case-seed-${locale}-${i}`
    await client.createOrReplace({
      _id: id,
      _type: 'caseStudy',
      language: locale,
      title: c.title,
      slug: { _type: 'slug', current: c.slug },
      excerpt: c.excerpt,
      industry: c.industry,
      result: c.result,
      body: toBlocks(c.body),
    })
    console.log(`seeded ${id} (${c.slug})`)
  }
}
console.log('done')
