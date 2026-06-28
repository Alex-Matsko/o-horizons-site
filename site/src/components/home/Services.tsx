import { useTranslations } from 'next-intl'

export default function Services() {
  const t = useTranslations('services')
  const items = t.raw('items') as { icon: string; title: string; description: string }[]

  return (
    <section id="services" className="py-20 px-6 lg:px-20">
      <div className="max-w-[1160px] mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#01696f] mb-2">{t('tag')}</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#e2e8f0] mb-12">{t('title')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(item => (
            <div key={item.title} className="bg-[#151820] border border-white/15 rounded-2xl p-6 hover:border-white/25 shadow-[0_2px_16px_rgba(0,0,0,0.4)] transition-colors">
              <div className="text-2xl mb-4">{item.icon}</div>
              <h3 className="text-base font-semibold text-[#e2e8f0] mb-2">{item.title}</h3>
              <p className="text-sm text-[#64748b] leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
