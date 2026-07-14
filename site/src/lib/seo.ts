import type { Metadata } from 'next'

const SITE_URL = 'https://o-horizons.com'

// Telegram's link-preview media fetcher can't reach o-horizons.com (RU
// hosting) even though its page-scraping bot can — confirmed by testing
// the same file hosted on GitHub, which loaded fine. Serving the OG image
// from there instead sidesteps that entirely. VK and other validators
// were unaffected either way. Revisit if a real non-RU CDN becomes
// available (Cloudflare R2, etc.) — this is a pragmatic stopgap, not
// something GitHub guarantees as production CDN infrastructure.
export const OG_IMAGE_URL = 'https://raw.githubusercontent.com/Alex-Matsko/o-horizons-site/v2.0/site/public/og-image.jpg'

export function pageUrl(locale: string, path = '') {
  const prefix = locale === 'en' ? '/en' : ''
  return path ? `${SITE_URL}${prefix}${path}` : `${SITE_URL}${prefix}/`
}

export function buildMetadata({
  locale,
  path = '',
  title,
  description,
}: {
  locale: string
  path?: string
  title: string
  description: string
}): Metadata {
  const url = pageUrl(locale, path)
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Открытые Горизонты · Open Horizons',
      images: [{ url: OG_IMAGE_URL, width: 1200, height: 630, alt: title }],
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
    },
    alternates: {
      canonical: url,
      languages: {
        ru: pageUrl('ru', path),
        en: pageUrl('en', path),
      },
    },
  }
}
