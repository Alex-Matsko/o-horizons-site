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

  const inputClass = 'w-full bg-[#020617] border border-[rgba(148,163,184,0.5)] rounded-[9px] px-3 py-2 text-sm text-[#e5e7eb] placeholder-[#4b5563] focus:outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_1px_rgba(59,130,246,0.6)] transition-all'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(15,23,42,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="relative w-full max-w-[480px] rounded-2xl p-6 overflow-y-auto max-h-[calc(100dvh-32px)] border border-[rgba(148,163,184,0.35)] my-auto flex-shrink-0"
        style={{ background: 'radial-gradient(circle at top left, rgba(56,189,248,0.16), transparent 55%), #0f172a', boxShadow: '0 22px 60px rgba(15,23,42,0.75)' }}
      >
        {/* Blue-green top stripe */}
        <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl opacity-90" style={{ background: 'linear-gradient(90deg, #3b82f6, #22c55e)' }} />

        <button onClick={onClose} className="absolute top-3.5 right-3.5 text-[#6b7280] hover:text-[#e5e7eb] hover:bg-[rgba(15,23,42,0.85)] rounded-full p-1.5 transition-all text-sm leading-none" aria-label="Закрыть">✕</button>

        <h2 id="modal-title" className="text-[1.2rem] font-bold text-[#e5e7eb] mb-1 uppercase tracking-wide pr-8">{t('title')}</h2>
        <p className="text-[0.85rem] text-[#9ca3af] mb-3.5">{t('sub')}</p>

        <div className="rounded-[9px] bg-[rgba(15,23,42,0.9)] border border-dashed border-[rgba(55,65,81,0.9)] px-3 py-2 mb-3 text-[0.8rem] text-[#9ca3af] flex flex-col gap-0.5">
          <strong className="text-[#e5e7eb] text-[0.75rem] uppercase tracking-wide">{t('contacts')}</strong>
          <a href="mailto:info@o-horizons.com" className="text-[#38bdf8] hover:underline">info@o-horizons.com</a>
          <a href="https://t.me/ohorizons" target="_blank" rel="noopener noreferrer" className="text-[#38bdf8] hover:underline">@ohorizons</a>
          <a href="tel:+79666660207" className="text-[#38bdf8] hover:underline">+7 (966) 666-02-07</a>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div>
            <label className="block text-[0.75rem] font-semibold text-[#9ca3af] mb-1 uppercase tracking-wide">{t('name')} *</label>
            <input name="name" type="text" required placeholder={t('namePlaceholder')} className={inputClass} ref={nameRef} />
          </div>
          <div>
            <label className="block text-[0.75rem] font-semibold text-[#9ca3af] mb-1 uppercase tracking-wide">{t('company')}</label>
            <input name="company" type="text" placeholder={t('companyPlaceholder')} className={inputClass} />
          </div>
          <div>
            <label className="block text-[0.75rem] font-semibold text-[#9ca3af] mb-1 uppercase tracking-wide">{t('phone')}</label>
            <input
              name="phone" type="tel" placeholder={t('phonePlaceholder')} inputMode="tel" autoComplete="tel"
              className={inputClass}
              onInput={e => { e.currentTarget.value = formatPhone(e.currentTarget.value) }}
              onFocus={e => { if (!e.currentTarget.value) e.currentTarget.value = '+7' }}
              onBlur={e => { if (e.currentTarget.value === '+7') e.currentTarget.value = '' }}
            />
          </div>
          <div>
            <label className="block text-[0.75rem] font-semibold text-[#9ca3af] mb-1 uppercase tracking-wide">{t('contact')} *</label>
            <input name="contact" type="text" required placeholder={t('contactPlaceholder')} className={inputClass} />
          </div>
          <div>
            <label className="block text-[0.75rem] font-semibold text-[#9ca3af] mb-1 uppercase tracking-wide">{t('message')}</label>
            <textarea name="message" rows={3} placeholder={t('messagePlaceholder')} className={inputClass + ' resize-y min-h-[72px]'} />
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer text-[0.78rem] text-[#6b7280] leading-[1.5]">
            <input name="consent" type="checkbox" className="mt-0.5 w-4 h-4 min-w-[1rem] accent-[#3b82f6] cursor-pointer" />
            <span>
              {t('consent')}{' '}
              <Link href="/privacy-policy" className="text-[#3b82f6] hover:underline" target="_blank">{t('consentLink')}</Link> *
            </span>
          </label>
          {status && (
            <p className={`text-sm text-center ${status.ok ? 'text-[#4ade80]' : 'text-[#f97373]'}`}>{status.msg}</p>
          )}
          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 text-white font-semibold rounded-full text-[0.92rem] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: loading ? '#4b5563' : 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: loading ? 'none' : '0 10px 28px rgba(37,99,235,0.4)' }}
          >
            {loading ? t('sending') : t('submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
