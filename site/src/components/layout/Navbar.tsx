'use client'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { useEffect, useState } from 'react'

interface NavbarProps {
  locale: string
  onOpenModal?: () => void
}

export default function Navbar({ locale, onOpenModal }: NavbarProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const altLocale = locale === 'ru' ? 'en' : 'ru'

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const isHome = pathname === '/'
  const homeHref = (anchor: string) => isHome ? `#${anchor}` : `/#${anchor}`

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0d0f14]/95 backdrop-blur-sm border-b border-white/[0.07] shadow-lg'
          : 'bg-[#0d0f14]/80 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-[1160px] mx-auto px-6 lg:px-20 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="На главную">
          <span className="text-[#01696f] text-xl">⬡</span>
          <span className="text-sm font-medium text-[#e2e8f0] hidden sm:block">
            Открытые{' '}
            <strong className="text-[#e2e8f0]">Горизонты</strong>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          <a href={homeHref('services')} className="px-3 py-1.5 text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">{t('services')}</a>
          <a href={homeHref('pricing')} className="px-3 py-1.5 text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">{t('pricing')}</a>
          <Link href="/calculator" className="px-3 py-1.5 text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">{t('calculator')}</Link>
          <a href={homeHref('about')} className="px-3 py-1.5 text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">{t('about')}</a>
          <button
            onClick={onOpenModal}
            className="ml-2 px-4 py-1.5 text-sm font-medium bg-[#01696f] hover:bg-[#017f85] text-white rounded-lg transition-colors"
          >
            {t('contact')}
          </button>
        </nav>

        {/* Right: phone + lang */}
        <div className="flex items-center gap-3 shrink-0">
          <a href="tel:+79666660207" className="hidden lg:block text-sm text-[#94a3b8] hover:text-[#e2e8f0] transition-colors" aria-label="Позвонить">
            {t('phone')}
          </a>
          <Link
            href={pathname}
            locale={altLocale}
            className="px-2.5 py-1 text-xs font-semibold border border-white/20 text-[#94a3b8] hover:text-[#e2e8f0] hover:border-white/40 rounded transition-colors"
          >
            {t('lang')}
          </Link>
        </div>
      </div>
    </header>
  )
}
