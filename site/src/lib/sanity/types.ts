export interface SanityArticle {
  _id: string
  slug: { current: string }
  title: string
  excerpt: string
  publishedAt: string
  body?: unknown
}

export interface SanityCase {
  _id: string
  slug: { current: string }
  title: string
  excerpt: string
  industry?: string
  result?: string
  body?: unknown
}

export interface SanityService {
  _id: string
  slug: { current: string }
  title: string
  icon: string
  shortDescription: string
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
