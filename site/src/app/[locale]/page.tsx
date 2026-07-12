import HomeClient from './HomeClient'
import { getHomeContent } from '@/lib/sanity/home'
import { getTranslations } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.home' })
  return buildMetadata({ locale, path: '', title: t('title'), description: t('description') })
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const content = await getHomeContent(locale)
  return <HomeClient locale={locale} content={content} />
}
