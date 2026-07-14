'use client'
import type { HeroContent } from '@/lib/sanity/home'

interface HeroProps { data: HeroContent; onOpenModal: () => void }

export default function Hero({ data, onOpenModal }: HeroProps) {
  return (
    <section className="relative pt-20 pb-[72px] overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 0%, rgba(59,130,246,0.12) 0%, transparent 60%), #0d0f14' }}>
      <div className="max-w-[1160px] mx-auto px-6 grid lg:grid-cols-2 gap-14 items-center">

        {/* Text */}
        <div className="max-w-[540px]">
          <p className="inline-block text-xs font-semibold uppercase tracking-widest text-[#3b82f6] bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] rounded-full px-3 py-1 mb-5">{data.tag}</p>
          <h1 className="text-[2.25rem] font-bold text-[#f9fafb] leading-[1.18] mb-[18px]">
            {data.title}
          </h1>
          <p className="text-[#94a3b8] mb-[26px] leading-relaxed">{data.sub1}</p>
          <p className="text-[#94a3b8] mb-8 leading-relaxed">{data.sub2}</p>

          <div className="flex flex-wrap gap-4 mb-10">
            <button
              onClick={onOpenModal}
              className="px-7 py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold rounded-[10px] transition-colors"
            >
              {data.cta}
            </button>
            <a
              href="#audits"
              className="px-7 py-3 border-[1.5px] border-[#334155] text-[#94a3b8] hover:border-[#64748b] hover:text-[#e2e8f0] rounded-[10px] font-semibold transition-colors"
            >
              {data.ctaOutline}
            </a>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-8">
            {data.stats.map(s => (
              <div key={s.label}>
                <span className="block text-[1.6rem] font-bold text-[#3b82f6]">{s.value}</span>
                <p className="text-xs text-[#64748b] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Server card visual */}
        <div className="hidden lg:block">
          <div className="bg-[#151820] border border-[rgba(255,255,255,0.08)] rounded-2xl p-7 font-mono text-sm">
            {data.serverCard.lines.map((line, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0 text-[#94a3b8]">
                <span className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_6px_#22c55e] shrink-0" />
                {line}
              </div>
            ))}
            <p className="text-xs text-[#475569] text-center mt-4">{data.serverCard.footer}</p>
          </div>
        </div>

      </div>
    </section>
  )
}
