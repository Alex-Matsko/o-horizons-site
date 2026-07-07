import { getTranslations } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getServices } from '@/lib/sanity/queries'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.services' })
  return { title: t('title'), description: t('description') }
}

function ServicesContent({ locale, services }: { locale: string; services: { _id: string; slug: { current: string }; title: string; icon: string; shortDescription: string }[] }) {
  const t = useTranslations('pages.services')

  return (
    <>
      <Navbar locale={locale} />
      <main className="flex-1 pt-24 pb-20 px-6">
        <div className="max-w-[1160px] mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-2">{t('tag')}</p>
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-3">{t('title')}</h1>
          <p className="text-[#64748b] mb-12">{t('sub')}</p>
          {services.length === 0 ? (
            <p className="text-[#475569] text-center py-20">{t('empty')}</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map(item => (
                <Link key={item._id} href={`/services/${item.slug.current}`} className="bg-[#151820] border border-white/[0.07] rounded-2xl p-6 hover:border-white/20 transition-colors flex flex-col">
                  <div className="text-2xl mb-4">{item.icon}</div>
                  <h2 className="text-base font-semibold text-[#e2e8f0] mb-2">{item.title}</h2>
                  <p className="text-sm text-[#64748b] leading-relaxed flex-1">{item.shortDescription}</p>
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

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const services = await getServices(locale)
  return <ServicesContent locale={locale} services={services} />
}
