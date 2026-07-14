import { getTranslations } from 'next-intl/server'
import ContactPageClient from './ContactPageClient'
import { getContactContent } from '@/lib/sanity/home'
import { buildMetadata } from '@/lib/seo'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.contact' })
  return buildMetadata({ locale, path: '/contact', title: t('title'), description: t('description') })
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const [t, contact] = await Promise.all([
    getTranslations({ locale, namespace: 'pages.contact' }),
    getContactContent(locale),
  ])

  return (
    <ContactPageClient
      locale={locale}
      header={{ tag: t('tag'), title: t('title'), sub: t('sub') }}
      contact={contact}
    />
  )
}
