'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export default function CookieBanner() {
  const t = useTranslations('cookie')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('cookieConsent')) setVisible(true)
  }, [])

  const accept = () => { localStorage.setItem('cookieConsent', 'accepted'); setVisible(false) }
  const decline = () => { localStorage.setItem('cookieConsent', 'declined'); setVisible(false) }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f172a] border-t border-white/[0.07] px-4 py-4 shadow-2xl">
      <div className="max-w-[1160px] mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-[#94a3b8] flex-1">
          {t('text')}{' '}
          <Link href="/privacy-policy" className="text-[#3b82f6] hover:underline">{t('policyLink')}</Link>.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={accept}
            className="px-4 py-2 text-sm font-semibold bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg transition-colors"
          >
            {t('accept')}
          </button>
          <button
            onClick={decline}
            className="px-4 py-2 text-sm font-medium border border-white/20 text-[#94a3b8] hover:text-[#e2e8f0] rounded-lg transition-colors"
          >
            {t('decline')}
          </button>
        </div>
      </div>
    </div>
  )
}
