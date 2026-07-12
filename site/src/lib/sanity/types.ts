export interface PortableBlock {
  _key: string
  style?: string
  children: { text: string }[]
}

export interface SanityArticle {
  _id: string
  slug: { current: string }
  title: string
  excerpt: string
  publishedAt: string
  body?: PortableBlock[]
}

export interface SanityCase {
  _id: string
  slug: { current: string }
  title: string
  excerpt: string
  industry?: string
  result?: string
  body?: PortableBlock[]
}

export interface SanityService {
  _id: string
  slug: { current: string }
  title: string
  icon: string
  shortDescription: string
  audience?: string
  problems?: string[]
  included?: string[]
  result?: string
  body?: unknown
}

export interface SanityTestimonial {
  _id: string
  authorName: string
  role?: string
  company?: string
  quote: string
  rating?: number
}

export interface SanityHero {
  _id: string
  tag: string
  title: string
  sub1: string
  sub2: string
  cta: string
  ctaOutline: string
  stats: { value: string; label: string }[]
  serverCard: { lines: string[]; footer: string }
}

export interface SanityServicesSection {
  _id: string
  tag: string
  title: string
}

export interface SanityAuditsSection {
  _id: string
  tag: string
  title: string
  sub: string
  items: { title: string; description: string; price: string }[]
}

export interface SanityPricingSection {
  _id: string
  tag: string
  title: string
  sub: string
  cta: string
  note?: string
  items: { name: string; subtitle: string; price: string; features: string[] }[]
}

export interface SanityAboutSection {
  _id: string
  tag: string
  title: string
  sub: string
  items: { icon: string; title: string; description: string }[]
}

export interface SanityFaqSection {
  _id: string
  tag: string
  title: string
  items: { q: string; a: string }[]
}

export interface SanityContactInfo {
  _id: string
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

export interface SanityProcessSteps {
  _id: string
  tag: string
  title: string
  items: { title: string; description: string }[]
}

export interface SanitySlaGuarantee {
  _id: string
  tag: string
  title: string
  sub: string
  items: { title: string; description: string }[]
}
