// One-time script: copies existing marketing copy from src/messages/{locale}.json
// into Sanity as initial documents, so Studio isn't empty on first use.
// Usage: npm run seed:sanity [-- --force]
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from 'next-sanity'
import { serviceDetails } from './service-details.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const siteDir = path.resolve(scriptDir, '..')
const force = process.argv.includes('--force')

function loadEnvLocal() {
  const envPath = path.join(siteDir, '.env.local')
  const env = {}
  if (!existsSync(envPath)) return env
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

const env = { ...loadEnvLocal(), ...process.env }
const projectId = env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = env.SANITY_WRITE_TOKEN

if (!projectId || !token) {
  console.log('Sanity is not configured for writing (need NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_WRITE_TOKEN in site/.env.local). Nothing to do.')
  process.exit(0)
}

const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false })

function loadMessages(locale) {
  const p = path.join(siteDir, 'src', 'messages', `${locale}.json`)
  return JSON.parse(readFileSync(p, 'utf8'))
}

const locales = ['ru', 'en']
const messagesByLocale = Object.fromEntries(locales.map(l => [l, loadMessages(l)]))

function singletonDocs() {
  const docs = []
  for (const locale of locales) {
    const m = messagesByLocale[locale]
    docs.push({ _id: `hero-${locale}`, _type: 'hero', language: locale, ...m.hero })
    docs.push({ _id: `servicesSection-${locale}`, _type: 'servicesSection', language: locale, tag: m.services.tag, title: m.services.title })
    docs.push({ _id: `auditsSection-${locale}`, _type: 'auditsSection', language: locale, tag: m.audits.tag, title: m.audits.title, sub: m.audits.sub, items: m.audits.items })
    docs.push({ _id: `pricingSection-${locale}`, _type: 'pricingSection', language: locale, tag: m.pricing.tag, title: m.pricing.title, sub: m.pricing.sub, cta: m.pricing.cta, note: m.pricing.note, items: m.pricing.items })
    docs.push({ _id: `aboutSection-${locale}`, _type: 'aboutSection', language: locale, tag: m.about.tag, title: m.about.title, sub: m.about.sub, items: m.about.items })
    docs.push({ _id: `faqSection-${locale}`, _type: 'faqSection', language: locale, tag: m.faq.tag, title: m.faq.title, items: m.faq.items })
    docs.push({
      _id: `contactInfo-${locale}`, _type: 'contactInfo', language: locale,
      tag: m.contact.tag, title: m.contact.title, sub: m.contact.sub, cta: m.contact.cta,
      email: m.contact.email, telegram: m.contact.telegram, phone: m.contact.phone,
      emailLabel: m.contact.emailLabel, telegramLabel: m.contact.telegramLabel, phoneLabel: m.contact.phoneLabel,
    })
    docs.push({ _id: `processSteps-${locale}`, _type: 'processSteps', language: locale, tag: m.processSteps.tag, title: m.processSteps.title, items: m.processSteps.items })
    docs.push({ _id: `slaGuarantee-${locale}`, _type: 'slaGuarantee', language: locale, tag: m.slaGuarantee.tag, title: m.slaGuarantee.title, sub: m.slaGuarantee.sub, items: m.slaGuarantee.items })
  }
  return docs
}

function serviceSeedDocs() {
  const docs = []
  for (const locale of locales) {
    const items = messagesByLocale[locale].services.items
    items.forEach((item, i) => {
      docs.push({
        _id: `service-seed-${locale}-${i}`,
        _type: 'service',
        language: locale,
        title: item.title,
        slug: { _type: 'slug', current: `service-${i + 1}` },
        icon: item.icon,
        shortDescription: item.description,
        ...(serviceDetails[locale]?.[i] ?? {}),
      })
    })
  }
  return docs
}

async function hasExistingRealServiceDocs() {
  const ids = await client.fetch(`*[_type == "service"]._id`)
  return ids.some(id => !id.startsWith('service-seed-'))
}

async function main() {
  const tx = client.transaction()
  for (const doc of singletonDocs()) tx.createOrReplace(doc)
  await tx.commit()
  console.log(`Seeded ${locales.length * 9} singleton documents (hero, servicesSection, auditsSection, pricingSection, aboutSection, faqSection, contactInfo, processSteps, slaGuarantee × ${locales.length} locales).`)

  if (process.argv.includes('--skip-services')) {
    console.log('Skipping "service" documents (--skip-services).')
    return
  }

  if (!force && await hasExistingRealServiceDocs()) {
    console.log('Found existing "service" documents not created by this script — skipping service seed. Re-run with --force to seed anyway.')
    return
  }

  const serviceTx = client.transaction()
  for (const doc of serviceSeedDocs()) serviceTx.createOrReplace(doc)
  await serviceTx.commit()
  console.log(`Seeded ${serviceSeedDocs().length} "service" documents.`)
}

main().catch(err => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
