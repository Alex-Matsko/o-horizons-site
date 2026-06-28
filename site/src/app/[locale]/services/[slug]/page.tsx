import { notFound } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getService } from '@/lib/sanity/queries'
import { Link } from '@/i18n/navigation'

export default async function ServicePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  const service = await getService(slug, locale)
  if (!service) notFound()

  return (
    <>
      <Navbar locale={locale} />
      <main className="flex-1 pt-24 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/services" className="text-sm text-[#64748b] hover:text-[#e2e8f0] transition-colors mb-8 inline-block">← Все услуги</Link>
          {service.icon && <div className="text-4xl mb-6">{service.icon}</div>}
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-4">{service.title}</h1>
          {service.shortDescription && <p className="text-lg text-[#94a3b8] mb-8 leading-relaxed">{service.shortDescription}</p>}
          <div className="text-[#475569] italic text-sm">Подробное описание услуги будет здесь.</div>
        </div>
      </main>
      <Footer locale={locale} />
    </>
  )
}
