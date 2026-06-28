import type { Metadata } from 'next'
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

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.home' })
  return {
    metadataBase: new URL('https://o-horizons.com'),
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: locale === 'ru' ? 'https://o-horizons.com/' : 'https://o-horizons.com/en/',
      images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
    },
    icons: { icon: '/favicon.png' },
    alternates: {
      canonical: locale === 'ru' ? 'https://o-horizons.com/' : 'https://o-horizons.com/en/',
      languages: { ru: 'https://o-horizons.com/', en: 'https://o-horizons.com/en/' },
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

  return (
    <html lang={locale} className={inter.className}>
      <body className="min-h-screen flex flex-col bg-[#0d0f14]">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
