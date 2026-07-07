import {
  getHero,
  getServicesSection,
  getHomeServices,
  getAuditsSection,
  getPricingSection,
  getAboutSection,
  getFaqSection,
  getContactInfo,
  getProcessSteps,
  getSlaGuarantee,
} from './queries'

export interface HeroContent {
  tag: string
  title: string
  sub1: string
  sub2: string
  cta: string
  ctaOutline: string
  stats: { value: string; label: string }[]
  serverCard: { lines: string[]; footer: string }
}

export interface ServicesContent {
  tag: string
  title: string
  items: { icon: string; title: string; description: string }[]
}

export interface AuditsContent {
  tag: string
  title: string
  sub: string
  items: { title: string; description: string; price: string }[]
}

export interface PricingContent {
  tag: string
  title: string
  sub: string
  popular: string
  cta: string
  note?: string
  items: { name: string; subtitle: string; price: string; popular: boolean; features: string[] }[]
}

export interface AboutContent {
  tag: string
  title: string
  sub: string
  items: { icon: string; title: string; description: string }[]
}

export interface FaqContent {
  tag: string
  title: string
  items: { q: string; a: string }[]
}

export interface ContactContent {
  tag: string
  title: string
  sub: string
  cta: string
  email: string
  telegram: string
  phone: string
  emailLabel: string
  telegramLabel: string
  phoneLabel: string
}

export interface ProcessStepsContent {
  tag: string
  title: string
  items: { title: string; description: string }[]
}

export interface SlaGuaranteeContent {
  tag: string
  title: string
  sub: string
  items: { title: string; description: string }[]
}

export interface HomeContent {
  hero: HeroContent
  processSteps: ProcessStepsContent
  services: ServicesContent
  audits: AuditsContent
  pricing: PricingContent
  slaGuarantee: SlaGuaranteeContent
  about: AboutContent
  faq: FaqContent
  contact: ContactContent
}

async function loadMessages(locale: string) {
  return (await import(`../../messages/${locale}.json`)).default
}

export async function getHeroContent(locale: string): Promise<HeroContent> {
  const doc = await getHero(locale)
  if (doc) {
    return {
      tag: doc.tag, title: doc.title, sub1: doc.sub1, sub2: doc.sub2,
      cta: doc.cta, ctaOutline: doc.ctaOutline, stats: doc.stats, serverCard: doc.serverCard,
    }
  }
  return (await loadMessages(locale)).hero
}

export async function getServicesContent(locale: string): Promise<ServicesContent> {
  const [section, services] = await Promise.all([getServicesSection(locale), getHomeServices(locale)])
  if (section && services.length > 0) {
    return {
      tag: section.tag,
      title: section.title,
      items: services.map(s => ({ icon: s.icon, title: s.title, description: s.shortDescription })),
    }
  }
  return (await loadMessages(locale)).services
}

export async function getAuditsContent(locale: string): Promise<AuditsContent> {
  const doc = await getAuditsSection(locale)
  if (doc) {
    return { tag: doc.tag, title: doc.title, sub: doc.sub, items: doc.items }
  }
  return (await loadMessages(locale)).audits
}

export async function getPricingContent(locale: string): Promise<PricingContent> {
  const doc = await getPricingSection(locale)
  if (doc) {
    return {
      tag: doc.tag, title: doc.title, sub: doc.sub, popular: doc.popular,
      cta: doc.cta, note: doc.note, items: doc.items,
    }
  }
  return (await loadMessages(locale)).pricing
}

export async function getAboutContent(locale: string): Promise<AboutContent> {
  const doc = await getAboutSection(locale)
  if (doc) {
    return { tag: doc.tag, title: doc.title, sub: doc.sub, items: doc.items }
  }
  return (await loadMessages(locale)).about
}

export async function getFaqContent(locale: string): Promise<FaqContent> {
  const doc = await getFaqSection(locale)
  if (doc) {
    return { tag: doc.tag, title: doc.title, items: doc.items }
  }
  return (await loadMessages(locale)).faq
}

export async function getContactContent(locale: string): Promise<ContactContent> {
  const doc = await getContactInfo(locale)
  if (doc) {
    return {
      tag: doc.tag, title: doc.title, sub: doc.sub, cta: doc.cta,
      email: doc.email, telegram: doc.telegram, phone: doc.phone,
      emailLabel: doc.emailLabel, telegramLabel: doc.telegramLabel, phoneLabel: doc.phoneLabel,
    }
  }
  return (await loadMessages(locale)).contact
}

export async function getProcessStepsContent(locale: string): Promise<ProcessStepsContent> {
  const doc = await getProcessSteps(locale)
  if (doc) {
    return { tag: doc.tag, title: doc.title, items: doc.items }
  }
  return (await loadMessages(locale)).processSteps
}

export async function getSlaGuaranteeContent(locale: string): Promise<SlaGuaranteeContent> {
  const doc = await getSlaGuarantee(locale)
  if (doc) {
    return { tag: doc.tag, title: doc.title, sub: doc.sub, items: doc.items }
  }
  return (await loadMessages(locale)).slaGuarantee
}

export async function getHomeContent(locale: string): Promise<HomeContent> {
  const [hero, processSteps, services, audits, pricing, slaGuarantee, about, faq, contact] = await Promise.all([
    getHeroContent(locale),
    getProcessStepsContent(locale),
    getServicesContent(locale),
    getAuditsContent(locale),
    getPricingContent(locale),
    getSlaGuaranteeContent(locale),
    getAboutContent(locale),
    getFaqContent(locale),
    getContactContent(locale),
  ])
  return { hero, processSteps, services, audits, pricing, slaGuarantee, about, faq, contact }
}
