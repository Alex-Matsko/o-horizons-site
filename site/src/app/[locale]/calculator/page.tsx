'use client'
import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Modal from '@/components/ui/Modal'
import CookieBanner from '@/components/ui/CookieBanner'

export default function CalculatorPage() {
  const t = useTranslations('calculator')
  const params = useParams()
  const locale = (params?.locale as string) || 'ru'
  const [modalOpen, setModalOpen] = useState(false)
  const [calcModalOpen, setCalcModalOpen] = useState(false)

  const slaOptions = t.raw('slaOptions') as { label: string; desc: string; mult: number }[]
  const contractOptions = t.raw('contractOptions') as { label: string; desc: string; discount: number }[]
  const serviceItems = t.raw('serviceItems') as { name: string; desc: string; price: number }[]
  const howSteps = t.raw('howSteps') as { title: string; desc: string }[]

  const [physical, setPhysical] = useState(2)
  const [vms, setVms] = useState(5)
  const [users, setUsers] = useState(15)
  const [selectedServices, setSelectedServices] = useState<number[]>([0])
  const [slaIdx, setSlaIdx] = useState(1)
  const [contractIdx, setContractIdx] = useState(1)

  const [formName, setFormName] = useState('')
  const [formCompany, setFormCompany] = useState('')
  const [formContact, setFormContact] = useState('')
  const [formComment, setFormComment] = useState('')
  const [formConsent, setFormConsent] = useState(false)
  const [formStatus, setFormStatus] = useState<{ msg: string; ok: boolean } | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const servicesCost = selectedServices.reduce((s, i) => s + serviceItems[i].price, 0)
  const slaMult = slaOptions[slaIdx].mult
  const discountPct = contractOptions[contractIdx].discount
  const subtotal = (physical * 4500 + vms * 1200 + users * 700 + servicesCost) * slaMult
  const total = Math.round(subtotal * (1 - discountPct / 100) / 100) * 100

  const fmt = (v: number) => v.toLocaleString('ru-RU')

  const getSummary = useCallback(() => {
    const svcNames = selectedServices.map(i => serviceItems[i].name).join(', ') || '—'
    return `${t('physical')}: ${physical}, ${t('vms')}: ${vms}, ${t('workstations')}: ${users}\n${t('systems')}: ${svcNames}\nSLA: ${slaOptions[slaIdx].label}, ${t('contract')}: ${contractOptions[contractIdx].label}\n${t('totalLabel')} ${fmt(total)} ₽/мес`
  }, [physical, vms, users, selectedServices, slaIdx, contractIdx, total, t, slaOptions, contractOptions, serviceItems, fmt])

  async function handleCalcSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formName || !formContact) { setFormStatus({ msg: t('errorFields'), ok: false }); return }
    if (!formConsent) { setFormStatus({ msg: t('errorConsent'), ok: false }); return }
    setFormLoading(true); setFormStatus(null)
    try {
      const r = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, company: formCompany, contact: formContact, message: formComment + '\n\n' + getSummary(), source: 'calculator' }),
      })
      const d = await r.json()
      if (d.ok) { setFormStatus({ msg: t('successMsg'), ok: true }); setFormName(''); setFormCompany(''); setFormContact(''); setFormComment(''); setFormConsent(false) }
      else setFormStatus({ msg: t('errorNetwork'), ok: false })
    } catch {
      setFormStatus({ msg: t('errorNetwork'), ok: false })
    } finally {
      setFormLoading(false)
    }
  }

  const toggleService = (i: number) => {
    setSelectedServices(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  return (
    <>
      <Navbar locale={locale} onOpenModal={() => setModalOpen(true)} />
      <main className="flex-1">
        {/* Hero */}
        <section className="pt-28 pb-12 px-6 text-center" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.10) 0%, transparent 60%), #0d0f14' }}>
          <div className="max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#01696f] mb-3">{t('tag')}</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#e2e8f0] mb-3">{t('title')}</h1>
            <p className="text-[#64748b]">{t('sub')}</p>
          </div>
        </section>

        {/* Calculator */}
        <section className="px-6 py-12">
          <div className="max-w-[1160px] mx-auto grid lg:grid-cols-[1fr_360px] gap-8 items-start">
            {/* Left */}
            <div className="space-y-5">
              {/* Servers */}
              <div className="bg-[#151820] border border-white/[0.07] rounded-2xl p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-[#e2e8f0] mb-5 flex items-center gap-2"><span>🖥️</span>{t('servers')}</p>
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span className="text-[#94a3b8]">{t('physical')}</span><span className="font-bold text-[#3b82f6]">{physical}</span></div>
                    <input type="range" min={0} max={20} value={physical} onChange={e => setPhysical(+e.target.value)} className="w-full" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span className="text-[#94a3b8]">{t('vms')}</span><span className="font-bold text-[#3b82f6]">{vms}</span></div>
                    <input type="range" min={0} max={50} value={vms} onChange={e => setVms(+e.target.value)} className="w-full" />
                  </div>
                </div>
              </div>

              {/* Users */}
              <div className="bg-[#151820] border border-white/[0.07] rounded-2xl p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-[#e2e8f0] mb-5 flex items-center gap-2"><span>👥</span>{t('users')}</p>
                <div className="flex justify-between text-sm mb-1"><span className="text-[#94a3b8]">{t('workstations')}</span><span className="font-bold text-[#3b82f6]">{users}</span></div>
                <input type="range" min={1} max={200} value={users} onChange={e => setUsers(+e.target.value)} className="w-full" />
              </div>

              {/* Systems */}
              <div className="bg-[#151820] border border-white/[0.07] rounded-2xl p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-[#e2e8f0] mb-5 flex items-center gap-2"><span>⚙️</span>{t('systems')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {serviceItems.map((svc, i) => {
                    const active = selectedServices.includes(i)
                    return (
                      <label
                        key={svc.name}
                        onClick={() => toggleService(i)}
                        className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${active ? 'border-[#3b82f6]/50 bg-[#3b82f6]/06' : 'border-white/[0.06] bg-[#0d0f14] hover:border-[#3b82f6]/30'}`}
                      >
                        <div className={`w-4.5 h-4.5 rounded shrink-0 border flex items-center justify-center text-[11px] mt-0.5 transition-colors ${active ? 'bg-[#3b82f6] border-[#3b82f6] text-white' : 'border-[#334155] text-transparent'}`}>✓</div>
                        <div>
                          <p className="text-sm font-medium text-[#e2e8f0]">{svc.name}</p>
                          <p className="text-xs text-[#64748b]">{svc.desc}</p>
                          <p className="text-xs text-[#3b82f6] font-semibold mt-0.5">от {fmt(svc.price)} ₽/мес</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* SLA */}
              <div className="bg-[#151820] border border-white/[0.07] rounded-2xl p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-[#e2e8f0] mb-5 flex items-center gap-2"><span>⏱️</span>{t('sla')}</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {slaOptions.map((opt, i) => (
                    <label key={opt.label} onClick={() => setSlaIdx(i)} className={`flex items-start gap-2 rounded-xl border p-3 cursor-pointer transition-all ${slaIdx === i ? 'border-[#3b82f6]/50 bg-[#3b82f6]/06' : 'border-white/[0.06] bg-[#0d0f14] hover:border-[#3b82f6]/30'}`}>
                      <div className={`w-4.5 h-4.5 rounded shrink-0 border flex items-center justify-center text-[11px] mt-0.5 transition-colors ${slaIdx === i ? 'bg-[#3b82f6] border-[#3b82f6] text-white' : 'border-[#334155] text-transparent'}`}>✓</div>
                      <div><p className="text-sm font-medium text-[#e2e8f0]">{opt.label}</p><p className="text-xs text-[#64748b]">{opt.desc}</p></div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Contract */}
              <div className="bg-[#151820] border border-white/[0.07] rounded-2xl p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-[#e2e8f0] mb-5 flex items-center gap-2"><span>📋</span>{t('contract')}</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {contractOptions.map((opt, i) => (
                    <label key={opt.label} onClick={() => setContractIdx(i)} className={`flex items-start gap-2 rounded-xl border p-3 cursor-pointer transition-all ${contractIdx === i ? 'border-[#3b82f6]/50 bg-[#3b82f6]/06' : 'border-white/[0.06] bg-[#0d0f14] hover:border-[#3b82f6]/30'}`}>
                      <div className={`w-4.5 h-4.5 rounded shrink-0 border flex items-center justify-center text-[11px] mt-0.5 transition-colors ${contractIdx === i ? 'bg-[#3b82f6] border-[#3b82f6] text-white' : 'border-[#334155] text-transparent'}`}>✓</div>
                      <div><p className="text-sm font-medium text-[#e2e8f0]">{opt.label}</p><p className="text-xs text-[#64748b]">{opt.desc}</p></div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Result panel */}
            <div className="lg:sticky lg:top-24">
              <div className="bg-[#0f172a] border border-[#3b82f6]/25 rounded-2xl p-7">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#64748b] mb-5">{t('resultTitle')}</p>
                <div className="space-y-0 divide-y divide-white/[0.04]">
                  {[
                    { label: t('rServers'), value: physical ? fmt(physical * 4500) + ' ₽' : '—' },
                    { label: t('rVM'), value: vms ? fmt(vms * 1200) + ' ₽' : '—' },
                    { label: t('rUsers'), value: fmt(users * 700) + ' ₽' },
                    { label: t('rServices'), value: servicesCost ? fmt(servicesCost) + ' ₽' : '—' },
                    { label: t('rSLA'), value: '×' + slaMult.toFixed(1) },
                    { label: t('rDiscount'), value: discountPct ? discountPct + '%' : '0%' },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between py-2 text-sm">
                      <span className="text-[#94a3b8]">{row.label}</span>
                      <span className="font-semibold text-[#e2e8f0]">{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-5 border-t border-[#3b82f6]/20">
                  <p className="text-xs text-[#64748b] mb-1">{t('totalLabel')}</p>
                  <p className="text-3xl font-extrabold text-[#f1f5f9] tracking-tight">{fmt(total)} <sup className="text-base font-semibold text-[#94a3b8]">₽</sup></p>
                  <p className="text-xs text-[#475569] mt-2 leading-relaxed">{t('note')}</p>
                </div>
                <div className="mt-4 bg-green-500/7 border border-green-500/20 rounded-xl p-3">
                  <p className="text-xs text-green-400 leading-relaxed">{t('auditTip')}</p>
                </div>
                <div className="mt-5 space-y-2.5">
                  <button onClick={() => setCalcModalOpen(true)} className="w-full py-3 bg-[#01696f] hover:bg-[#017f85] text-white font-medium rounded-xl transition-colors text-sm">
                    {t('getCta')}
                  </button>
                  <a href={locale === 'ru' ? '/#pricing' : '/en/#pricing'} className="block w-full py-3 border border-white/20 text-[#94a3b8] hover:text-[#e2e8f0] font-medium rounded-xl transition-colors text-sm text-center">
                    {t('pricingCta')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 px-6 bg-[#0a0c10]">
          <div className="max-w-[1160px] mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#01696f] mb-2">{t('howTag')}</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#e2e8f0] mb-12">{t('howTitle')}</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {howSteps.map((step, i) => (
                <div key={i} className="bg-[#151820] border border-white/[0.07] rounded-2xl p-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-[#3b82f6]/15 text-[#3b82f6] font-bold flex items-center justify-center mx-auto mb-4">{i + 1}</div>
                  <h3 className="text-base font-semibold text-[#e2e8f0] mb-2">{step.title}</h3>
                  <p className="text-sm text-[#64748b] leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />

      {/* Calc modal */}
      {calcModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setCalcModalOpen(false) }}>
          <div className="relative w-full max-w-lg bg-[#151820] border border-white/[0.07] rounded-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh]">
            <button onClick={() => setCalcModalOpen(false)} className="absolute top-4 right-4 text-[#64748b] hover:text-[#e2e8f0]">✕</button>
            <h2 className="text-xl font-bold text-[#e2e8f0] mb-1">{t('modalTitle')}</h2>
            <p className="text-sm text-[#64748b] mb-4">{t('modalSub')}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#94a3b8] mb-5">
              <span className="font-semibold text-[#e2e8f0]">{t('modalContacts')}</span>
              <a href="mailto:info@o-horizons.com" className="hover:text-[#e2e8f0]">info@o-horizons.com</a>
              <a href="https://t.me/ohorizons" target="_blank" rel="noopener noreferrer" className="hover:text-[#e2e8f0]">@ohorizons</a>
            </div>
            <form onSubmit={handleCalcSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-[#94a3b8] mb-1">{t('fieldName')} *</label>
                  <input value={formName} onChange={e => setFormName(e.target.value)} required className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#01696f]" />
                </div>
                <div>
                  <label className="block text-sm text-[#94a3b8] mb-1">{t('fieldCompany')}</label>
                  <input value={formCompany} onChange={e => setFormCompany(e.target.value)} className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#01696f]" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#94a3b8] mb-1">{t('fieldContact')} *</label>
                <input value={formContact} onChange={e => setFormContact(e.target.value)} required className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] focus:outline-none focus:border-[#01696f]" />
              </div>
              <div>
                <label className="block text-sm text-[#94a3b8] mb-1">{t('fieldSummary')}</label>
                <textarea rows={3} value={getSummary()} readOnly className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2.5 text-xs text-[#475569] focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm text-[#94a3b8] mb-1">{t('fieldComment')}</label>
                <textarea value={formComment} onChange={e => setFormComment(e.target.value)} rows={2} placeholder={t('commentPlaceholder')} className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#475569] focus:outline-none focus:border-[#01696f] resize-none" />
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={formConsent} onChange={e => setFormConsent(e.target.checked)} className="mt-0.5 accent-[#01696f]" />
                <span className="text-xs text-[#64748b]">Согласен(а) на обработку персональных данных</span>
              </label>
              {formStatus && <p className={`text-sm ${formStatus.ok ? 'text-green-400' : 'text-red-400'}`}>{formStatus.msg}</p>}
              <button type="submit" disabled={formLoading} className="w-full py-3 bg-[#01696f] hover:bg-[#017f85] disabled:opacity-60 text-white font-medium rounded-xl transition-colors">
                {formLoading ? t('sending') : t('submitBtn')}
              </button>
            </form>
          </div>
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} />
      <CookieBanner />
    </>
  )
}
