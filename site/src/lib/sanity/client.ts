import { createClient } from 'next-sanity'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const apiVersion = '2024-01-01'

export const isSanityConfigured = Boolean(projectId)

const client = isSanityConfigured
  ? createClient({ projectId: projectId!, dataset, apiVersion, useCdn: process.env.NODE_ENV === 'production' })
  : null

export async function sanityFetch<T>(query: string, params: Record<string, unknown> = {}): Promise<T | null> {
  if (!client) return null
  try {
    return await client.fetch<T>(query, params)
  } catch {
    return null
  }
}
