import HomeClient from './HomeClient'
import { getHomeContent } from '@/lib/sanity/home'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const content = await getHomeContent(locale)
  return <HomeClient locale={locale} content={content} />
}
