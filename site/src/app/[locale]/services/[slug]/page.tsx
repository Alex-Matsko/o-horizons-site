import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getService } from '@/lib/sanity/queries'
import { Link } from '@/i18n/navigation'
import { buildMetadata } from '@/lib/seo'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params
  const [service, t] = await Promise.all([
    getService(slug, locale),
    getTranslations({ locale, namespace: 'metadata.services' }),
  ])
  if (!service) return buildMetadata({ locale, path: `/services/${slug}`, title: t('title'), description: t('description') })
  const brand = locale === 'ru' ? 'Открытые Горизонты' : 'Open Horizons'
  return buildMetadata({
    locale,
    path: `/services/${slug}`,
    title: `${service.title} — ${brand}`,
    description: service.shortDescription || t('description'),
  })
}

export default async function ServicePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  const [service, t] = await Promise.all([
    getService(slug, locale),
    getTranslations({ locale, namespace: 'pages.services' }),
  ])
  if (!service) notFound()

  const hasDetails = service.audience || service.problems?.length || service.included?.length || service.result

  return (
    <>
      <Navbar locale={locale} />
      <main className="flex-1 pt-24 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/services" className="text-sm text-[#64748b] hover:text-[#e2e8f0] transition-colors mb-8 inline-block">{t('backAll')}</Link>
          {service.icon && <div className="text-4xl mb-6">{service.icon}</div>}
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-4">{service.title}</h1>
          {service.shortDescription && <p className="text-lg text-[#94a3b8] mb-10 leading-relaxed">{service.shortDescription}</p>}

          {hasDetails ? (
            <>
              {service.audience && (
                <section className="mb-10">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">{t('forWhom')}</h2>
                  <p className="text-[0.95rem] text-[#94a3b8] leading-[1.8]">{service.audience}</p>
                </section>
              )}

              {service.problems && service.problems.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-4">{t('problems')}</h2>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {service.problems.map(item => (
                      <li key={item} className="bg-[#151820] border border-[rgba(255,255,255,0.07)] rounded-xl px-4 py-3.5 text-[0.88rem] text-[#94a3b8] leading-[1.6]">
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {service.included && service.included.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-4">{t('included')}</h2>
                  <ul className="flex flex-col gap-2.5">
                    {service.included.map(item => (
                      <li key={item} className="text-[0.92rem] text-[#94a3b8] leading-[1.7] pl-6 relative">
                        <span className="absolute left-0 top-0 text-[#22c55e] font-bold">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {service.result && (
                <section className="mb-12">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">{t('result')}</h2>
                  <div className="bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded-xl p-5">
                    <p className="text-[0.95rem] text-[#cbd5e1] leading-[1.8]">{service.result}</p>
                  </div>
                </section>
              )}

              <div className="flex flex-wrap gap-4">
                <Link href="/contact" className="px-7 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold rounded-[10px] transition-colors">
                  {t('ctaContact')}
                </Link>
                <Link href="/calculator" className="px-7 py-3 border-[1.5px] border-[#334155] text-[#94a3b8] hover:border-[#64748b] hover:text-[#e2e8f0] rounded-[10px] font-semibold transition-colors">
                  {t('ctaCalc')}
                </Link>
              </div>
            </>
          ) : (
            <div className="text-[#475569] italic text-sm">{t('detailPlaceholder')}</div>
          )}
        </div>
      </main>
      <Footer locale={locale} />
    </>
  )
}
