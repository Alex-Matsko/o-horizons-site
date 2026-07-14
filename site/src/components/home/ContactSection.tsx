'use client'
import type { ContactContent } from '@/lib/sanity/home'

interface ContactSectionProps { data: ContactContent; onOpenModal: () => void }

export default function ContactSection({ data, onOpenModal }: ContactSectionProps) {
  return (
    <section id="contact" className="py-[88px] px-6 bg-[#0a0c10] border-t border-[rgba(255,255,255,0.05)]">
      <div className="max-w-[1160px] mx-auto text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">{data.tag}</p>
        <h2 className="text-[1.8rem] font-bold text-[#f1f5f9] mb-3.5">{data.title}</h2>
        <p className="text-[#64748b] mb-10 max-w-[640px] mx-auto">{data.sub}</p>
        <div className="grid sm:grid-cols-3 gap-4 max-w-[640px] mx-auto mb-9">
          <a href={`mailto:${data.email}`} className="flex items-center gap-3 bg-[#151820] border border-[rgba(255,255,255,0.07)] hover:border-[rgba(59,130,246,0.4)] rounded-[12px] px-4 py-[18px] transition-colors min-h-[80px]">
            <span className="text-[1.6rem] shrink-0 leading-none w-8 text-center">✉️</span>
            <div className="text-left min-w-0">
              <p className="text-[0.8rem] text-[#64748b] mb-0.5">{data.emailLabel}</p>
              <p className="text-[0.85rem] font-medium text-[#e2e8f0] truncate">{data.email}</p>
            </div>
          </a>
          <a href={`https://t.me/${data.telegram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-[#151820] border border-[rgba(255,255,255,0.07)] hover:border-[rgba(59,130,246,0.4)] rounded-[12px] px-4 py-[18px] transition-colors min-h-[80px]">
            <span className="text-[1.6rem] shrink-0 leading-none w-8 text-center">✈️</span>
            <div className="text-left min-w-0">
              <p className="text-[0.8rem] text-[#64748b] mb-0.5">{data.telegramLabel}</p>
              <p className="text-[0.85rem] font-medium text-[#e2e8f0] truncate">{data.telegram}</p>
            </div>
          </a>
          <a href={`tel:${data.phone.replace(/[^+\d]/g, '')}`} className="flex items-center gap-3 bg-[#151820] border border-[rgba(255,255,255,0.07)] hover:border-[rgba(59,130,246,0.4)] rounded-[12px] px-4 py-[18px] transition-colors min-h-[80px]">
            <span className="text-[1.6rem] shrink-0 leading-none w-8 text-center">📞</span>
            <div className="text-left min-w-0">
              <p className="text-[0.8rem] text-[#64748b] mb-0.5">{data.phoneLabel}</p>
              <p className="text-[0.85rem] font-medium text-[#e2e8f0] truncate">{data.phone}</p>
            </div>
          </a>
        </div>
        <button
          onClick={onOpenModal}
          className="px-[36px] py-4 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold rounded-[10px] transition-colors text-base"
        >
          {data.cta}
        </button>
      </div>
    </section>
  )
}
