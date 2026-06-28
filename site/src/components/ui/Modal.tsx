'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

interface ModalProps {
  open: boolean
  onClose: () => void
}

export default function Modal({ open, onClose }: ModalProps) {
  const t = useTranslations('modal')
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => nameRef.current?.focus(), 50)
    } else {
      document.body.style.overflow = ''
      setStatus(null)
    }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return ''
    const d = digits[0] !== '7' ? '7' + digits : digits
    const n = d.slice(1)
    let out = '+7'
    if (n.length > 0) out += ' (' + n.slice(0, 3)
    if (n.length > 3) out += ') ' + n.slice(3, 6)
    if (n.length > 6) out += '-' + n.slice(6, 8)
    if (n.length > 8) out += '-' + n.slice(8, 10)
    return out
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))
    if (!data.consent) { setStatus({ msg: t('errorConsent'), ok: false }); return }
    setLoading(true); setStatus(null)
    try {
      const r = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, company: data.company, phone: data.phone, contact: data.contact, message: data.message }),
      })
      const j = await r.json()
      if (j.ok) { setStatus({ msg: t('successMsg'), ok: true }); form.reset() }
      else setStatus({ msg: t('errorServer') + (j.error || ''), ok: false })
    } catch {
      setStatus({ msg: t('errorNetwork'), ok: false })
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-lg bg-[#151820] border border-white/[0.07] rounded-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#64748b] hover:text-[#e2e8f0] transition-colors text-lg" aria-label="Закрыть">✕</button>
        <h2 id="modal-title" className="text-xl font-bold text-[#e2e8f0] mb-1">{t('title')}</h2>
        <p className="text-sm text-[#64748b] mb-5">{t('sub')}</p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#94a3b8] mb-5">
          <span className="font-semibold text-[#e2e8f0]">{t('contacts')}</span>
          <a href="mailto:info@o-horizons.com" className="hover:text-[#e2e8f0] transition-colors">info@o-horizons.com</a>
          <a href="https://t.me/ohorizons" target="_blank" rel="noopener noreferrer" className="hover:text-[#e2e8f0] transition-colors">@ohorizons</a>
          <a href="tel:+79666660207" className="hover:text-[#e2e8f0] transition-colors">+7 (966) 666-02-07</a>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">{t('name')} *</label>
            <input name="name" type="text" required placeholder={t('namePlaceholder')} className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#475569] focus:outline-none focus:border-[#01696f] transition-colors" ref={nameRef} />
          </div>
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">{t('company')}</label>
            <input name="company" type="text" placeholder={t('companyPlaceholder')} className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#475569] focus:outline-none focus:border-[#01696f] transition-colors" />
          </div>
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">{t('phone')}</label>
            <input
              name="phone" type="tel" placeholder={t('phonePlaceholder')} inputMode="tel" autoComplete="tel"
              className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#475569] focus:outline-none focus:border-[#01696f] transition-colors"
              onInput={e => { e.currentTarget.value = formatPhone(e.currentTarget.value) }}
              onFocus={e => { if (!e.currentTarget.value) e.currentTarget.value = '+7' }}
              onBlur={e => { if (e.currentTarget.value === '+7') e.currentTarget.value = '' }}
            />
          </div>
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">{t('contact')} *</label>
            <input name="contact" type="text" required placeholder={t('contactPlaceholder')} className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#475569] focus:outline-none focus:border-[#01696f] transition-colors" />
          </div>
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">{t('message')}</label>
            <textarea name="message" rows={3} placeholder={t('messagePlaceholder')} className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#475569] focus:outline-none focus:border-[#01696f] transition-colors resize-none" />
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input name="consent" type="checkbox" className="mt-0.5 accent-[#01696f]" />
            <span className="text-xs text-[#64748b]">
              {t('consent')}{' '}
              <Link href="/privacy-policy" className="text-[#3b82f6] hover:underline" target="_blank">{t('consentLink')}</Link> *
            </span>
          </label>
          {status && (
            <p className={`text-sm ${status.ok ? 'text-green-400' : 'text-red-400'}`}>{status.msg}</p>
          )}
          <button
            type="submit" disabled={loading}
            className="w-full py-3 bg-[#01696f] hover:bg-[#017f85] disabled:opacity-60 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? t('sending') : t('submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
