// Seeds the six knowledge-base articles from articles-content.mjs into Sanity.
// Idempotent: uses deterministic IDs and createOrReplace, safe to re-run.
// Usage: node scripts/seed-articles.mjs
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from 'next-sanity'
import { articles } from './articles-content.mjs'

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
  return items.map(item => {
    if (item.type === 'stat') {
      return { _type: 'statRow', _key: nextKey(), items: item.items }
    }
    if (item.type === 'callout') {
      return { _type: 'callout', _key: nextKey(), title: item.title, text: item.text }
    }
    if (item.type === 'table') {
      return { _type: 'compareTable', _key: nextKey(), headers: item.headers, rows: item.rows }
    }
    return {
      _type: 'block',
      _key: nextKey(),
      style: item.type === 'h3' ? 'h3' : 'normal',
      markDefs: [],
      ...(item.type === 'li' ? { listItem: 'bullet', level: 1 } : {}),
      children: [{ _type: 'span', _key: nextKey(), text: item.text, marks: [] }],
    }
  })
}

for (const locale of ['ru', 'en']) {
  const items = articles[locale]
  for (let i = 0; i < items.length; i++) {
    const a = items[i]
    const id = `article-seed-${locale}-${i}`
    await client.createOrReplace({
      _id: id,
      _type: 'article',
      language: locale,
      title: a.title,
      slug: { _type: 'slug', current: a.slug },
      excerpt: a.excerpt,
      publishedAt: new Date(a.publishedAt).toISOString(),
      body: toBlocks(a.body),
    })
    console.log(`seeded ${id} (${a.slug})`)
  }
}
console.log('done')
