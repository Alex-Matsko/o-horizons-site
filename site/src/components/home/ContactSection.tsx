'use client'
import { useTranslations } from 'next-intl'

interface ContactSectionProps { onOpenModal: () => void }

export default function ContactSection({ onOpenModal }: ContactSectionProps) {
  const t = useTranslations('contact')

  return (
    <section id="contact" className="py-20 px-6 bg-[#0a0c10]">
      <div className="max-w-[1160px] mx-auto text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#01696f] mb-2">{t('tag')}</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#e2e8f0] mb-4">{t('title')}</h2>
        <p className="text-[#64748b] mb-10 max-w-xl mx-auto">{t('sub')}</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
          <a href={`mailto:${t('email')}`} className="flex items-center gap-3 bg-[#151820] border border-white/[0.07] hover:border-white/20 rounded-2xl px-6 py-4 transition-colors group">
            <span className="text-xl">✉️</span>
            <div className="text-left">
              <p className="text-xs text-[#64748b]">{t('emailLabel')}</p>
              <p className="text-sm font-medium text-[#e2e8f0]">{t('email')}</p>
            </div>
          </a>
          <a href="https://t.me/ohorizons" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-[#151820] border border-white/[0.07] hover:border-white/20 rounded-2xl px-6 py-4 transition-colors">
            <span className="text-xl">✈️</span>
            <div className="text-left">
              <p className="text-xs text-[#64748b]">{t('telegramLabel')}</p>
              <p className="text-sm font-medium text-[#e2e8f0]">{t('telegram')}</p>
            </div>
          </a>
          <a href={`tel:+79666660207`} className="flex items-center gap-3 bg-[#151820] border border-white/[0.07] hover:border-white/20 rounded-2xl px-6 py-4 transition-colors">
            <span className="text-xl">📞</span>
            <div className="text-left">
              <p className="text-xs text-[#64748b]">{t('phoneLabel')}</p>
              <p className="text-sm font-medium text-[#e2e8f0]">{t('phone')}</p>
            </div>
          </a>
        </div>
        <button
          onClick={onOpenModal}
          className="px-8 py-3.5 bg-[#01696f] hover:bg-[#017f85] text-white font-medium rounded-xl transition-colors text-base"
        >
          {t('cta')}
        </button>
      </div>
    </section>
  )
}
