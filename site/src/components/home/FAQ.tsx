'use client'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

export default function FAQ() {
  const t = useTranslations('faq')
  const items = t.raw('items') as { q: string; a: string }[]
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="py-20 px-6 lg:px-20">
      <div className="max-w-[1160px] mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#01696f] mb-2">{t('tag')}</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#e2e8f0] mb-12">{t('title')}</h2>
        <div className="max-w-3xl space-y-2">
          {items.map((item, i) => (
            <div key={i} className="bg-[#151820] border border-white/15 rounded-xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.4)]">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-[#e2e8f0] hover:text-white transition-colors"
                aria-expanded={open === i}
              >
                <span>{item.q}</span>
                <span className={`ml-4 shrink-0 text-[#64748b] transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-[#64748b] leading-relaxed border-t border-white/[0.05] pt-3">
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
