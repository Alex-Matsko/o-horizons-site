import { useTranslations } from 'next-intl'

export default function Audits() {
  const t = useTranslations('audits')
  const items = t.raw('items') as { title: string; description: string; price: string }[]

  return (
    <section id="audits" className="py-20 px-6 lg:px-20 bg-[#0a0c10]">
      <div className="max-w-[1160px] mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#01696f] mb-2">{t('tag')}</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#e2e8f0] mb-3">{t('title')}</h2>
        <p className="text-[#64748b] mb-12 max-w-2xl">{t('sub')}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(item => (
            <div key={item.title} className="bg-[#151820] border border-white/15 rounded-2xl p-6 flex flex-col hover:border-white/25 shadow-[0_2px_16px_rgba(0,0,0,0.5)] transition-colors">
              <h3 className="text-base font-semibold text-[#e2e8f0] mb-2">{item.title}</h3>
              <p className="text-sm text-[#64748b] leading-relaxed flex-1">{item.description}</p>
              <p className="mt-4 text-[#01696f] font-semibold text-sm">{item.price}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
