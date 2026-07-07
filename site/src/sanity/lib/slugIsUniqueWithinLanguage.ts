import type { SlugIsUniqueValidator } from 'sanity'

// Default Sanity slug uniqueness ignores our `language` field, so a ru and en
// document (separate docs, same content) sharing a slug value are treated as
// a conflict. Scope uniqueness to the same document type + language instead.
export const slugIsUniqueWithinLanguage: SlugIsUniqueValidator = async (slug, context) => {
  const { document, getClient } = context
  const client = getClient({ apiVersion: '2024-01-01' })
  const id = document?._id.replace(/^drafts\./, '')
  const language = (document as { language?: string } | undefined)?.language
  const params = { docId: id ?? '', slug, type: document?._type, language: language ?? null }
  const query = `!defined(*[_type == $type && language == $language && slug.current == $slug && !(_id in [$docId, "drafts." + $docId])][0]._id)`
  return client.fetch(query, params)
}
