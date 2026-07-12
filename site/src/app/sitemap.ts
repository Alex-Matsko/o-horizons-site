import type { MetadataRoute } from 'next'
import { routing } from '@/i18n/routing'
import { pageUrl } from '@/lib/seo'
import { getServices, getCases, getArticles } from '@/lib/sanity/queries'

const staticPaths = [
  '', '/services', '/cases', '/articles', '/testimonials', '/about', '/contact', '/calculator', '/oferta', '/privacy-policy',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []

  for (const locale of routing.locales) {
    for (const path of staticPaths) {
      entries.push({ url: pageUrl(locale, path), lastModified: new Date() })
    }

    const [services, cases, articles] = await Promise.all([
      getServices(locale),
      getCases(locale),
      getArticles(locale),
    ])

    for (const s of services) entries.push({ url: pageUrl(locale, `/services/${s.slug.current}`), lastModified: new Date() })
    for (const c of cases) entries.push({ url: pageUrl(locale, `/cases/${c.slug.current}`), lastModified: new Date() })
    for (const a of articles) entries.push({ url: pageUrl(locale, `/articles/${a.slug.current}`), lastModified: new Date() })
  }

  return entries
}
