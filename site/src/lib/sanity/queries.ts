import { sanityFetch } from './client'
import type {
  SanityArticle,
  SanityCase,
  SanityService,
  SanityTestimonial,
  SanityHero,
  SanityServicesSection,
  SanityAuditsSection,
  SanityPricingSection,
  SanityAboutSection,
  SanityFaqSection,
  SanityContactInfo,
} from './types'

export async function getArticles(locale: string): Promise<SanityArticle[]> {
  const data = await sanityFetch<SanityArticle[]>(
    `*[_type == "article" && language == $locale] | order(publishedAt desc) { _id, slug, title, excerpt, publishedAt }`,
    { locale }
  )
  return data ?? []
}

export async function getArticle(slug: string, locale: string): Promise<SanityArticle | null> {
  return sanityFetch<SanityArticle>(
    `*[_type == "article" && slug.current == $slug && language == $locale][0]`,
    { slug, locale }
  )
}

export async function getCases(locale: string): Promise<SanityCase[]> {
  const data = await sanityFetch<SanityCase[]>(
    `*[_type == "caseStudy" && language == $locale] | order(_createdAt desc) { _id, slug, title, excerpt, industry, result }`,
    { locale }
  )
  return data ?? []
}

export async function getCase(slug: string, locale: string): Promise<SanityCase | null> {
  return sanityFetch<SanityCase>(
    `*[_type == "caseStudy" && slug.current == $slug && language == $locale][0]`,
    { slug, locale }
  )
}

export async function getServices(locale: string): Promise<SanityService[]> {
  const data = await sanityFetch<SanityService[]>(
    `*[_type == "service" && language == $locale] | order(_createdAt asc) { _id, slug, title, icon, shortDescription }`,
    { locale }
  )
  return data ?? []
}

export async function getService(slug: string, locale: string): Promise<SanityService | null> {
  return sanityFetch<SanityService>(
    `*[_type == "service" && slug.current == $slug && language == $locale][0]`,
    { slug, locale }
  )
}

export async function getTestimonials(locale: string): Promise<SanityTestimonial[]> {
  const data = await sanityFetch<SanityTestimonial[]>(
    `*[_type == "testimonial" && language == $locale] | order(_createdAt desc) { _id, authorName, role, company, quote, rating }`,
    { locale }
  )
  return data ?? []
}

export async function getHero(locale: string): Promise<SanityHero | null> {
  return sanityFetch<SanityHero>(
    `*[_type == "hero" && language == $locale][0]`,
    { locale }
  )
}

export async function getServicesSection(locale: string): Promise<SanityServicesSection | null> {
  return sanityFetch<SanityServicesSection>(
    `*[_type == "servicesSection" && language == $locale][0]`,
    { locale }
  )
}

export async function getHomeServices(locale: string): Promise<SanityService[]> {
  const data = await sanityFetch<SanityService[]>(
    `*[_type == "service" && language == $locale] | order(_createdAt asc) [0...6] { _id, slug, title, icon, shortDescription }`,
    { locale }
  )
  return data ?? []
}

export async function getAuditsSection(locale: string): Promise<SanityAuditsSection | null> {
  return sanityFetch<SanityAuditsSection>(
    `*[_type == "auditsSection" && language == $locale][0]`,
    { locale }
  )
}

export async function getPricingSection(locale: string): Promise<SanityPricingSection | null> {
  return sanityFetch<SanityPricingSection>(
    `*[_type == "pricingSection" && language == $locale][0]`,
    { locale }
  )
}

export async function getAboutSection(locale: string): Promise<SanityAboutSection | null> {
  return sanityFetch<SanityAboutSection>(
    `*[_type == "aboutSection" && language == $locale][0]`,
    { locale }
  )
}

export async function getFaqSection(locale: string): Promise<SanityFaqSection | null> {
  return sanityFetch<SanityFaqSection>(
    `*[_type == "faqSection" && language == $locale][0]`,
    { locale }
  )
}

export async function getContactInfo(locale: string): Promise<SanityContactInfo | null> {
  return sanityFetch<SanityContactInfo>(
    `*[_type == "contactInfo" && language == $locale][0]`,
    { locale }
  )
}
