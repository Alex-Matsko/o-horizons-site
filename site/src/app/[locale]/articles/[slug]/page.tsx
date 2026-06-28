import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getArticle } from '@/lib/sanity/queries'
import { Link } from '@/i18n/navigation'

export default async function ArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  const article = await getArticle(slug, locale)
  if (!article) notFound()

  return (
    <>
      <Navbar locale={locale} />
      <main className="flex-1 pt-24 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/articles" className="text-sm text-[#64748b] hover:text-[#e2e8f0] transition-colors mb-8 inline-block">← Все статьи</Link>
          <p className="text-xs text-[#475569] mb-3">{new Date(article.publishedAt).toLocaleDateString(locale)}</p>
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-6">{article.title}</h1>
          {article.excerpt && <p className="text-lg text-[#94a3b8] mb-8 leading-relaxed">{article.excerpt}</p>}
          <div className="prose prose-invert max-w-none text-[#94a3b8]">
            <p className="text-[#475569] italic">Содержимое статьи будет здесь.</p>
          </div>
        </div>
      </main>
      <Footer locale={locale} />
    </>
  )
}
