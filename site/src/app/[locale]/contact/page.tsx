'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Modal from '@/components/ui/Modal'

export default function ContactPage() {
  const t = useTranslations('pages.contact')
  const ct = useTranslations('contact')
  const params = useParams()
  const locale = (params?.locale as string) || 'ru'
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <Navbar locale={locale} onOpenModal={() => setModalOpen(true)} />
      <main className="flex-1 pt-24 pb-20 px-6">
        <div className="max-w-[1160px] mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#01696f] mb-2">{t('tag')}</p>
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-4">{t('title')}</h1>
          <p className="text-[#64748b] mb-12 max-w-xl mx-auto">{t('sub')}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
            <a href={`mailto:${ct('email')}`} className="flex items-center gap-3 bg-[#151820] border border-white/[0.07] hover:border-white/20 rounded-2xl px-6 py-4 transition-colors">
              <span className="text-xl">✉️</span>
              <div className="text-left"><p className="text-xs text-[#64748b]">{ct('emailLabel')}</p><p className="text-sm font-medium text-[#e2e8f0]">{ct('email')}</p></div>
            </a>
            <a href="https://t.me/ohorizons" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-[#151820] border border-white/[0.07] hover:border-white/20 rounded-2xl px-6 py-4 transition-colors">
              <span className="text-xl">✈️</span>
              <div className="text-left"><p className="text-xs text-[#64748b]">{ct('telegramLabel')}</p><p className="text-sm font-medium text-[#e2e8f0]">{ct('telegram')}</p></div>
            </a>
            <a href="tel:+79666660207" className="flex items-center gap-3 bg-[#151820] border border-white/[0.07] hover:border-white/20 rounded-2xl px-6 py-4 transition-colors">
              <span className="text-xl">📞</span>
              <div className="text-left"><p className="text-xs text-[#64748b]">{ct('phoneLabel')}</p><p className="text-sm font-medium text-[#e2e8f0]">{ct('phone')}</p></div>
            </a>
          </div>
          <button onClick={() => setModalOpen(true)} className="px-8 py-3.5 bg-[#01696f] hover:bg-[#017f85] text-white font-medium rounded-xl transition-colors">
            {ct('cta')}
          </button>
        </div>
      </main>
      <Footer locale={locale} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
