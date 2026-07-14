import { getTranslations } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getAboutContent } from '@/lib/sanity/home'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.about' })
  return { title: t('title'), description: t('description') }
}

function AboutContent({ locale, items }: { locale: string; items: { icon: string; title: string; description: string }[] }) {
  const t = useTranslations('pages.about')

  return (
    <>
      <Navbar locale={locale} />
      <main className="flex-1 pt-24 pb-20 px-6">
        <div className="max-w-[1160px] mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-2">{t('tag')}</p>
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-3">{t('title')}</h1>
          <p className="text-[#64748b] mb-12 max-w-2xl">{t('sub')}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {items.map(item => (
              <div key={item.title} className="bg-[#151820] border border-white/[0.07] rounded-2xl p-6">
                <div className="text-2xl mb-4">{item.icon}</div>
                <h2 className="text-base font-semibold text-[#e2e8f0] mb-2">{item.title}</h2>
                <p className="text-sm text-[#64748b] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#151820] border border-white/[0.07] rounded-2xl p-8">
            <p className="text-[#475569] italic">{t('placeholder')}</p>
          </div>
        </div>
      </main>
      <Footer locale={locale} />
    </>
  )
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const about = await getAboutContent(locale)
  return <AboutContent locale={locale} items={about.items} />
}
