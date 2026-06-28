import { notFound } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getCase } from '@/lib/sanity/queries'
import { Link } from '@/i18n/navigation'

export default async function CasePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  const caseItem = await getCase(slug, locale)
  if (!caseItem) notFound()

  return (
    <>
      <Navbar locale={locale} />
      <main className="flex-1 pt-24 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/cases" className="text-sm text-[#64748b] hover:text-[#e2e8f0] transition-colors mb-8 inline-block">← Все кейсы</Link>
          {caseItem.industry && <p className="text-xs text-[#475569] mb-3">{caseItem.industry}</p>}
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-4">{caseItem.title}</h1>
          {caseItem.result && (
            <div className="bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded-xl p-4 mb-8">
              <p className="text-sm text-[#3b82f6] font-medium">{caseItem.result}</p>
            </div>
          )}
          {caseItem.excerpt && <p className="text-lg text-[#94a3b8] mb-8 leading-relaxed">{caseItem.excerpt}</p>}
          <div className="text-[#475569] italic text-sm">Подробное описание кейса будет здесь.</div>
        </div>
      </main>
      <Footer locale={locale} />
    </>
  )
}
