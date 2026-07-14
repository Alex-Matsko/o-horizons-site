import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import '../globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'], display: 'swap' })

export async function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}

export const viewport: Viewport = {
  themeColor: '#0d0f14',
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.home' })
  const siteName = 'Открытые Горизонты · Open Horizons'
  return {
    metadataBase: new URL('https://o-horizons.com'),
    title: t('title'),
    description: t('description'),
    manifest: '/manifest.webmanifest',
    openGraph: {
      title: t('title'),
      description: t('description'),
      siteName,
      images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: t('title') }],
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
    },
    icons: {
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon.png', type: 'image/png' },
      ],
      apple: '/apple-touch-icon.png',
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!(routing.locales as readonly string[]).includes(locale)) notFound()
  const messages = await getMessages()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Открытые Горизонты',
    alternateName: 'Open Horizons',
    url: 'https://o-horizons.com',
    logo: 'https://o-horizons.com/favicon.png',
    email: 'info@o-horizons.com',
    telephone: '+79666660207',
    sameAs: ['https://t.me/ohorizons'],
  }

  return (
    <html lang={locale} className={inter.className}>
      <body className="min-h-screen flex flex-col bg-[#0d0f14]">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
