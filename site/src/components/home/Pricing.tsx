'use client'
import { useTranslations } from 'next-intl'

interface PricingProps { onOpenModal: () => void }

export default function Pricing({ onOpenModal }: PricingProps) {
  const t = useTranslations('pricing')
  const items = t.raw('items') as { name: string; subtitle: string; price: string; popular: boolean; features: string[] }[]

  return (
    <section id="pricing" className="py-[88px] px-6">
      <div className="max-w-[1160px] mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">{t('tag')}</p>
        <h2 className="text-[2rem] font-bold text-[#f1f5f9] mb-4">{t('title')}</h2>
        <p className="text-[#64748b] mb-10">{t('sub')}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-5">
          {items.map(plan => (
            <div
              key={plan.name}
              className={`relative bg-[#151820] rounded-2xl p-8 flex flex-col border transition-colors h-full ${
                plan.popular
                  ? 'border-[#3b82f6]'
                  : 'border-[rgba(255,255,255,0.07)] hover:border-[rgba(59,130,246,0.3)]'
              }`}
              style={plan.popular ? { background: 'linear-gradient(160deg, #1a2035, #151820)' } : undefined}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 bg-[#3b82f6] text-white text-[0.72rem] font-bold rounded-full uppercase tracking-wide">
                  {t('popular')}
                </span>
              )}
              <h3 className="text-[1.1rem] font-bold text-[#e2e8f0] mb-2">{plan.name}</h3>
              <p className="text-[0.82rem] text-[#64748b] mb-3.5">{plan.subtitle}</p>
              <p className="text-[1.35rem] font-bold text-[#f1f5f9] mb-[18px]">{plan.price}</p>
              <ul className="flex flex-col gap-2.5 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="text-[0.85rem] text-[#94a3b8] pl-[18px] relative">
                    <span className="absolute left-0 top-0 text-[#22c55e] font-bold">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onOpenModal}
                className={`w-full py-3 rounded-[10px] text-[0.9rem] font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white'
                    : 'bg-[rgba(59,130,246,0.15)] text-[#3b82f6] border border-[rgba(59,130,246,0.3)] hover:bg-[rgba(59,130,246,0.25)]'
                }`}
              >
                {t('cta')}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#475569] text-center">{t('note')}</p>
      </div>
    </section>
  )
}
