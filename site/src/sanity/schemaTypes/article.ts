import { defineType, defineField } from 'sanity'
import { slugIsUniqueWithinLanguage } from '../lib/slugIsUniqueWithinLanguage'

export const article = defineType({
  name: 'article',
  title: 'Статья / Article',
  type: 'document',
  fields: [
    defineField({ name: 'language', title: 'Language', type: 'string', options: { list: ['ru', 'en'] }, initialValue: 'ru' }),
    defineField({ name: 'title', title: 'Title', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', isUnique: slugIsUniqueWithinLanguage }, validation: r => r.required() }),
    defineField({ name: 'excerpt', title: 'Excerpt', type: 'text', rows: 3 }),
    defineField({ name: 'publishedAt', title: 'Published at', type: 'datetime', initialValue: () => new Date().toISOString() }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        { type: 'block' },
        {
          type: 'object',
          name: 'statRow',
          title: 'Stat row',
          fields: [
            defineField({
              name: 'items',
              title: 'Stats',
              type: 'array',
              of: [{
                type: 'object',
                fields: [
                  defineField({ name: 'value', title: 'Value', type: 'string' }),
                  defineField({ name: 'label', title: 'Label', type: 'string' }),
                ],
              }],
            }),
          ],
          preview: { select: { title: 'items.0.label' } },
        },
        {
          type: 'object',
          name: 'callout',
          title: 'Callout',
          fields: [
            defineField({ name: 'title', title: 'Title (optional)', type: 'string' }),
            defineField({ name: 'text', title: 'Text', type: 'text', rows: 3 }),
          ],
          preview: { select: { title: 'title', subtitle: 'text' } },
        },
        {
          type: 'object',
          name: 'compareTable',
          title: 'Comparison table',
          fields: [
            defineField({ name: 'headers', title: 'Column headers', type: 'array', of: [{ type: 'string' }] }),
            defineField({
              name: 'rows',
              title: 'Rows',
              type: 'array',
              of: [{
                type: 'object',
                fields: [
                  defineField({ name: 'a', title: 'Column A', type: 'string' }),
                  defineField({ name: 'b', title: 'Column B', type: 'string' }),
                ],
              }],
            }),
          ],
          preview: { select: { title: 'headers.0' } },
        },
      ],
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'language' } },
})
