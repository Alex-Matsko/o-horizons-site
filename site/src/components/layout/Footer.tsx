import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export default function Footer({ locale }: { locale: string }) {
  const t = useTranslations('footer')
  const shareUrl = locale === 'ru'
    ? 'https://o-horizons.com/&text=IT-аутсорсинг%20и%20аудит%20инфраструктуры'
    : 'https://o-horizons.com/en/&text=IT%20outsourcing%20and%20infrastructure%20audit'

  return (
    <footer className="border-t border-white/[0.07] py-8 mt-auto">
      <div className="max-w-[1160px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#64748b]">
        <div className="flex items-center gap-2">
          <span className="text-[#3b82f6] text-lg">⬡</span>
          <span>Открытые <strong className="text-[#64748b]">Горизонты</strong></span>
        </div>
        <div className="text-center">
          <p>{t('copy')}</p>
          <p className="text-xs mt-0.5 text-[#475569]">{t('inn')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/privacy-policy" className="hover:text-[#94a3b8] transition-colors">{t('privacy')}</Link>
          <span>·</span>
          <Link href="/oferta" className="hover:text-[#94a3b8] transition-colors">{t('oferta')}</Link>
          <span>·</span>
          <a
            href={`https://t.me/share/url?url=${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#94a3b8] transition-colors"
          >
            Telegram
          </a>
        </div>
      </div>
    </footer>
  )
}
