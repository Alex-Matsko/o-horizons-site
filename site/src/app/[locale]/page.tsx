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
import { useParams } from 'next/navigation'

export default function HomePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const params = useParams()
  const locale = (params?.locale as string) || 'ru'

  return (
    <>
      <Navbar locale={locale} onOpenModal={() => setModalOpen(true)} />
      <main className="flex-1">
        <Hero onOpenModal={() => setModalOpen(true)} />
        <Services />
        <Audits />
        <Pricing onOpenModal={() => setModalOpen(true)} />
        <AboutSection />
        <FAQ />
        <ContactSection onOpenModal={() => setModalOpen(true)} />
      </main>
      <Footer locale={locale} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} />
      <CookieBanner />
      <ChatWidget />
    </>
  )
}
