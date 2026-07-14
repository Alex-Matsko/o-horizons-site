import { getTranslations } from 'next-intl/server'
import { buildMetadata } from '@/lib/seo'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.calculator' })
  return buildMetadata({ locale, path: '/calculator', title: t('title'), description: t('description') })
}

export default function CalculatorLayout({ children }: { children: React.ReactNode }) {
  return children
}
