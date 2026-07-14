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
  const [menuOpen, setMenuOpen] = useState(false)
  const altLocale = locale === 'ru' ? 'en' : 'ru'

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const isHome = pathname === '/'
  const homeHref = (anchor: string) => isHome ? `#${anchor}` : `/#${anchor}`
  const closeMenu = () => setMenuOpen(false)

  const pageLinks = [
    { href: '/services', label: t('services') },
    { href: '/cases', label: t('cases') },
    { href: '/articles', label: t('articles') },
    { href: '/testimonials', label: t('testimonials') },
  ] as const

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || menuOpen
          ? 'bg-[#0d0f14]/95 backdrop-blur-sm border-b border-white/[0.06] shadow-lg'
          : 'bg-[#0d0f14]/92 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-[1160px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label={t('homeAria')}>
          <span className="text-[#3b82f6] text-xl leading-none">⬡</span>
          <span className="text-sm font-semibold text-[#e2e8f0]">
            {t('brandA')}{' '}
            <strong className="text-[#3b82f6]">{t('brandB')}</strong>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden lg:flex items-center">
          {pageLinks.map(l => (
            <Link key={l.href} href={l.href} className="px-2 py-1.5 text-sm whitespace-nowrap text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">{l.label}</Link>
          ))}
          <a href={homeHref('pricing')} className="px-2 py-1.5 text-sm whitespace-nowrap text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">{t('pricing')}</a>
          <Link href="/calculator" className="px-2 py-1.5 text-sm whitespace-nowrap text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">{t('calculator')}</Link>
          <Link href="/about" className="px-2 py-1.5 text-sm whitespace-nowrap text-[#94a3b8] hover:text-[#e2e8f0] transition-colors">{t('about')}</Link>
          <button
            onClick={onOpenModal}
            className="ml-2 px-4 py-1.5 text-sm font-semibold whitespace-nowrap bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg transition-colors"
          >
            {t('contact')}
          </button>
        </nav>

        {/* Right: phone + lang + burger */}
        <div className="flex items-center gap-3 shrink-0">
          <a href="tel:+79666660207" className="hidden lg:block text-sm font-semibold text-[#e2e8f0] hover:text-[#3b82f6] transition-colors">
            {t('phone')}
          </a>
          <Link
            href={pathname}
            locale={altLocale}
            className="px-2.5 py-1 text-xs font-semibold border border-[#334155] text-[#64748b] hover:text-[#e2e8f0] hover:border-[#64748b] rounded transition-colors"
          >
            {t('lang')}
          </Link>
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label={t('menuAria')}
            aria-expanded={menuOpen}
            className="lg:hidden flex flex-col justify-center items-center w-9 h-9 gap-[5px] rounded border border-[#334155] hover:border-[#64748b] transition-colors"
          >
            <span className={`block w-4 h-[1.5px] bg-[#e2e8f0] transition-transform duration-200 ${menuOpen ? 'translate-y-[6.5px] rotate-45' : ''}`} />
            <span className={`block w-4 h-[1.5px] bg-[#e2e8f0] transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-4 h-[1.5px] bg-[#e2e8f0] transition-transform duration-200 ${menuOpen ? '-translate-y-[6.5px] -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="lg:hidden border-t border-white/[0.06] bg-[#0d0f14]/98 backdrop-blur-sm px-6 py-4 flex flex-col gap-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
          {pageLinks.map(l => (
            <Link key={l.href} href={l.href} onClick={closeMenu} className="py-2.5 text-[15px] text-[#94a3b8] hover:text-[#e2e8f0] transition-colors border-b border-white/[0.04]">{l.label}</Link>
          ))}
          <a href={homeHref('pricing')} onClick={closeMenu} className="py-2.5 text-[15px] text-[#94a3b8] hover:text-[#e2e8f0] transition-colors border-b border-white/[0.04]">{t('pricing')}</a>
          <Link href="/calculator" onClick={closeMenu} className="py-2.5 text-[15px] text-[#94a3b8] hover:text-[#e2e8f0] transition-colors border-b border-white/[0.04]">{t('calculator')}</Link>
          <Link href="/about" onClick={closeMenu} className="py-2.5 text-[15px] text-[#94a3b8] hover:text-[#e2e8f0] transition-colors border-b border-white/[0.04]">{t('about')}</Link>
          <a href="tel:+79666660207" className="py-2.5 text-[15px] font-semibold text-[#e2e8f0]">{t('phone')}</a>
          <button
            onClick={() => { closeMenu(); onOpenModal?.() }}
            className="mt-2 py-3 text-sm font-semibold bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg transition-colors"
          >
            {t('contact')}
          </button>
        </nav>
      )}
    </header>
  )
}
