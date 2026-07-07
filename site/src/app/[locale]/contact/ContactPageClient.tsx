'use client'
import { useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Modal from '@/components/ui/Modal'
import type { ContactContent } from '@/lib/sanity/home'

interface ContactPageClientProps {
  locale: string
  header: { tag: string; title: string; sub: string }
  contact: ContactContent
}

export default function ContactPageClient({ locale, header, contact }: ContactPageClientProps) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <Navbar locale={locale} onOpenModal={() => setModalOpen(true)} />
      <main className="flex-1 pt-24 pb-20 px-6">
        <div className="max-w-[1160px] mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-2">{header.tag}</p>
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-4">{header.title}</h1>
          <p className="text-[#64748b] mb-12 max-w-xl mx-auto">{header.sub}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
            <a href={`mailto:${contact.email}`} className="flex items-center gap-3 bg-[#151820] border border-white/[0.07] hover:border-white/20 rounded-2xl px-6 py-4 transition-colors">
              <span className="text-xl">✉️</span>
              <div className="text-left"><p className="text-xs text-[#64748b]">{contact.emailLabel}</p><p className="text-sm font-medium text-[#e2e8f0]">{contact.email}</p></div>
            </a>
            <a href={`https://t.me/${contact.telegram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-[#151820] border border-white/[0.07] hover:border-white/20 rounded-2xl px-6 py-4 transition-colors">
              <span className="text-xl">✈️</span>
              <div className="text-left"><p className="text-xs text-[#64748b]">{contact.telegramLabel}</p><p className="text-sm font-medium text-[#e2e8f0]">{contact.telegram}</p></div>
            </a>
            <a href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`} className="flex items-center gap-3 bg-[#151820] border border-white/[0.07] hover:border-white/20 rounded-2xl px-6 py-4 transition-colors">
              <span className="text-xl">📞</span>
              <div className="text-left"><p className="text-xs text-[#64748b]">{contact.phoneLabel}</p><p className="text-sm font-medium text-[#e2e8f0]">{contact.phone}</p></div>
            </a>
          </div>
          <button onClick={() => setModalOpen(true)} className="px-8 py-3.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium rounded-xl transition-colors">
            {contact.cta}
          </button>
        </div>
      </main>
      <Footer locale={locale} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
