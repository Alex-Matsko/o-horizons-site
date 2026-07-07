import { sanityFetch } from './client'
import type { SanityArticle, SanityCase, SanityService, SanityTestimonial } from './types'

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
