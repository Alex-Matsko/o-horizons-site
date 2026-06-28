import { useTranslations } from 'next-intl'

export default function AboutSection() {
  const t = useTranslations('about')
  const items = t.raw('items') as { icon: string; title: string; description: string }[]

  return (
    <section id="about" className="py-[88px] px-6 bg-[#0a0c10] border-t border-[rgba(255,255,255,0.05)]">
      <div className="max-w-[1160px] mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">{t('tag')}</p>
        <h2 className="text-[2rem] font-bold text-[#f1f5f9] mb-4">{t('title')}</h2>
        <p className="text-[#64748b] mb-10 max-w-[600px] leading-[1.7]">{t('sub')}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map(item => (
            <div key={item.title} className="bg-[#151820] border border-[rgba(255,255,255,0.07)] rounded-[14px] p-7 flex flex-col gap-2.5 hover:border-[rgba(59,130,246,0.3)] transition-[border-color,transform] duration-200 hover:-translate-y-[2px] h-full">
              <div className="text-[2rem] leading-none">{item.icon}</div>
              <h3 className="text-[0.98rem] font-semibold text-[#e2e8f0]">{item.title}</h3>
              <p className="text-[0.87rem] text-[#64748b] leading-[1.65] flex-1">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
