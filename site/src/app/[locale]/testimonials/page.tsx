import { getTranslations } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { getTestimonials } from '@/lib/sanity/queries'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata.testimonials' })
  return { title: t('title'), description: t('description') }
}

function TestimonialsContent({ locale, testimonials }: { locale: string; testimonials: { _id: string; authorName: string; role?: string; company?: string; quote: string; rating?: number }[] }) {
  const t = useTranslations('pages.testimonials')
  return (
    <>
      <Navbar locale={locale} />
      <main className="flex-1 pt-24 pb-20 px-6">
        <div className="max-w-[1160px] mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-2">{t('tag')}</p>
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-3">{t('title')}</h1>
          <p className="text-[#64748b] mb-12">{t('sub')}</p>
          {testimonials.length === 0 ? (
            <p className="text-[#475569] text-center py-20">{t('empty')}</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {testimonials.map(item => (
                <div key={item._id} className="bg-[#151820] border border-white/[0.07] rounded-2xl p-6 flex flex-col">
                  {item.rating && (
                    <p className="text-[#3b82f6] mb-3" aria-label={`${item.rating}/5`}>
                      {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                    </p>
                  )}
                  <p className="text-sm text-[#94a3b8] leading-relaxed flex-1">«{item.quote}»</p>
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <p className="text-sm font-semibold text-[#e2e8f0]">{item.authorName}</p>
                    {(item.role || item.company) && (
                      <p className="text-xs text-[#64748b] mt-0.5">
                        {[item.role, item.company].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer locale={locale} />
    </>
  )
}

export default async function TestimonialsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const testimonials = await getTestimonials(locale)
  return <TestimonialsContent locale={locale} testimonials={testimonials} />
}
