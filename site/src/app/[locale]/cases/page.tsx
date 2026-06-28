import { getTranslations } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getCases } from '@/lib/sanity/queries'
import { Link } from '@/i18n/navigation'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.cases' })
  return { title: t('title'), description: t('description') }
}

function CasesContent({ locale, cases }: { locale: string; cases: { _id: string; slug: { current: string }; title: string; excerpt: string; industry?: string; result?: string }[] }) {
  const t = useTranslations('pages.cases')
  return (
    <>
      <Navbar locale={locale} />
      <main className="flex-1 pt-24 pb-20 px-6">
        <div className="max-w-[1160px] mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-2">{t('tag')}</p>
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-3">{t('title')}</h1>
          <p className="text-[#64748b] mb-12">{t('sub')}</p>
          {cases.length === 0 ? (
            <p className="text-[#475569] text-center py-20">{t('empty')}</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cases.map(c => (
                <Link key={c._id} href={`/cases/${c.slug.current}`} className="bg-[#151820] border border-white/[0.07] rounded-2xl p-6 hover:border-white/20 transition-colors flex flex-col">
                  {c.industry && <p className="text-xs text-[#475569] mb-2">{c.industry}</p>}
                  <h2 className="text-base font-semibold text-[#e2e8f0] mb-2">{c.title}</h2>
                  <p className="text-sm text-[#64748b] leading-relaxed flex-1">{c.excerpt}</p>
                  {c.result && <p className="mt-3 text-sm text-[#3b82f6] font-medium">{c.result}</p>}
                  <span className="mt-4 text-sm text-[#3b82f6] font-medium">{t('readMore')} →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer locale={locale} />
    </>
  )
}

export default async function CasesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const cases = await getCases(locale)
  return <CasesContent locale={locale} cases={cases} />
}
