'use client'
import { useTranslations } from 'next-intl'

interface PricingProps { onOpenModal: () => void }

export default function Pricing({ onOpenModal }: PricingProps) {
  const t = useTranslations('pricing')
  const items = t.raw('items') as { name: string; subtitle: string; price: string; popular: boolean; features: string[] }[]

  return (
    <section id="pricing" className="py-20 px-6">
      <div className="max-w-[1160px] mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#01696f] mb-2">{t('tag')}</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#e2e8f0] mb-3">{t('title')}</h2>
        <p className="text-[#64748b] mb-12">{t('sub')}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map(plan => (
            <div
              key={plan.name}
              className={`relative bg-[#151820] rounded-2xl p-6 flex flex-col border transition-colors ${
                plan.popular
                  ? 'border-[#01696f] shadow-[0_0_30px_-10px] shadow-[#01696f]/40'
                  : 'border-white/[0.07] hover:border-white/20'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#01696f] text-white text-xs font-semibold rounded-full">
                  {t('popular')}
                </span>
              )}
              <h3 className="text-base font-bold text-[#e2e8f0]">{plan.name}</h3>
              <p className="text-xs text-[#64748b] mt-0.5 mb-3">{plan.subtitle}</p>
              <p className="text-lg font-bold text-[#e2e8f0] mb-5">{plan.price}</p>
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#94a3b8]">
                    <span className="text-[#01696f] mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onOpenModal}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  plan.popular
                    ? 'bg-[#01696f] hover:bg-[#017f85] text-white'
                    : 'border border-white/20 text-[#94a3b8] hover:text-[#e2e8f0] hover:border-white/40'
                }`}
              >
                {t('cta')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
