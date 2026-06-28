import { useTranslations } from 'next-intl'

export default function Services() {
  const t = useTranslations('services')
  const items = t.raw('items') as { icon: string; title: string; description: string }[]

  return (
    <section id="services" className="py-[88px] px-6">
      <div className="max-w-[1160px] mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">{t('tag')}</p>
        <h2 className="text-[2rem] font-bold text-[#f1f5f9] mb-4">{t('title')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <div key={item.title} className="bg-[#151820] border border-[rgba(255,255,255,0.07)] rounded-[14px] p-7 hover:border-[rgba(59,130,246,0.35)] transition-[border-color,transform] duration-200 hover:-translate-y-[3px] flex flex-col">
              <div className="text-[2rem] mb-[14px]">{item.icon}</div>
              <h3 className="text-base font-semibold text-[#e2e8f0] mb-2.5">{item.title}</h3>
              <p className="text-sm text-[#64748b] leading-[1.7] flex-1">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
