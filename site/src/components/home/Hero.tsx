'use client'
import { useTranslations } from 'next-intl'

interface HeroProps { onOpenModal: () => void }

export default function Hero({ onOpenModal }: HeroProps) {
  const t = useTranslations('hero')
  const stats = t.raw('stats') as { value: string; label: string }[]
  const card = t.raw('serverCard') as { lines: string[]; footer: string }

  return (
    <section className="relative pt-28 pb-20 px-6 lg:px-20 overflow-hidden">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_30%,rgba(1,105,111,0.12),transparent)]" />
      <div className="relative max-w-[1160px] mx-auto grid lg:grid-cols-2 gap-12 items-center">

        {/* Text */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#01696f] mb-4">{t('tag')}</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#e2e8f0] leading-tight mb-6">
            {t('title')}
          </h1>
          <p className="text-[#94a3b8] mb-3 leading-relaxed">{t('sub1')}</p>
          <p className="text-[#94a3b8] mb-8 leading-relaxed">{t('sub2')}</p>

          <div className="flex flex-wrap gap-3 mb-10">
            <button
              onClick={onOpenModal}
              className="px-6 py-3 bg-[#01696f] hover:bg-[#017f85] text-white font-medium rounded-xl transition-colors"
            >
              {t('cta')}
            </button>
            <a
              href="#audits"
              className="px-6 py-3 border border-white/20 text-[#94a3b8] hover:text-[#e2e8f0] hover:border-white/40 rounded-xl transition-colors"
            >
              {t('ctaOutline')}
            </a>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-8">
            {stats.map(s => (
              <div key={s.label}>
                <span className="block text-2xl font-bold text-[#e2e8f0]">{s.value}</span>
                <p className="text-sm text-[#64748b]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Server card visual */}
        <div className="hidden lg:flex justify-center">
          <div className="bg-[#151820] border border-white/15 rounded-2xl p-6 w-full max-w-sm shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
            <div className="space-y-3.5 mb-5">
              {card.lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-[#94a3b8]">
                  <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_2px] shadow-green-400/50 shrink-0" />
                  {line}
                </div>
              ))}
            </div>
            <p className="text-xs text-[#475569] border-t border-white/[0.05] pt-4">{card.footer}</p>
          </div>
        </div>

      </div>
    </section>
  )
}
