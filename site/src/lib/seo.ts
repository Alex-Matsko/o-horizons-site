import type { Metadata } from 'next'

const SITE_URL = 'https://o-horizons.com'

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
      images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: title }],
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
