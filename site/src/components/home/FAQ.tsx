'use client'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export default function FAQ() {
  const t = useTranslations('faq')
  const items = t.raw('items') as { q: string; a: string }[]
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="py-[88px] px-6">
      <div className="max-w-[1160px] mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">{t('tag')}</p>
        <h2 className="text-[2rem] font-bold text-[#f1f5f9] mb-4">{t('title')}</h2>
        <p className="text-[0.9rem] text-[#64748b] mb-7">{t('sub')}</p>
        <div className="rounded-2xl border border-[rgba(148,163,184,0.15)] bg-[#0d0f14] overflow-hidden max-w-full">
          {items.map((item, i) => (
            <div key={i} className={i > 0 ? 'border-t border-[rgba(255,255,255,0.05)]' : ''}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-[18px] text-left text-[0.95rem] font-medium text-[#e2e8f0] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                aria-expanded={open === i}
              >
                <span>{item.q}</span>
                <span className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-[0.9rem] transition-all duration-200 ${
                  open === i
                    ? 'rotate-90 bg-[rgba(59,130,246,0.15)] text-[#3b82f6] border-[rgba(59,130,246,0.5)]'
                    : 'border-[#334155] text-[#94a3b8]'
                }`}>›</span>
              </button>
              {open === i && (
                <div className="px-5 pb-[18px] text-[0.9rem] text-[#94a3b8] leading-[1.65]">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
