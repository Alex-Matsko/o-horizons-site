'use client'
import { useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Hero from '@/components/home/Hero'
import Services from '@/components/home/Services'
import Audits from '@/components/home/Audits'
import Pricing from '@/components/home/Pricing'
import AboutSection from '@/components/home/AboutSection'
import FAQ from '@/components/home/FAQ'
import ContactSection from '@/components/home/ContactSection'
import Modal from '@/components/ui/Modal'
import CookieBanner from '@/components/ui/CookieBanner'
import ChatWidget from '@/components/ui/ChatWidget'
import type { HomeContent } from '@/lib/sanity/home'

export default function HomeClient({ locale, content }: { locale: string; content: HomeContent }) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <Navbar locale={locale} onOpenModal={() => setModalOpen(true)} />
      <main className="flex-1">
        <Hero data={content.hero} onOpenModal={() => setModalOpen(true)} />
        <Services {...content.services} />
        <Audits data={content.audits} />
        <Pricing data={content.pricing} onOpenModal={() => setModalOpen(true)} />
        <AboutSection data={content.about} />
        <FAQ data={content.faq} />
        <ContactSection data={content.contact} onOpenModal={() => setModalOpen(true)} />
      </main>
      <Footer locale={locale} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} />
      <CookieBanner />
      <ChatWidget />
    </>
  )
}
