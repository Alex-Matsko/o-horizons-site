import { defineType, defineField } from 'sanity'

export const pricingSection = defineType({
  name: 'pricingSection',
  title: 'Секция тарифов / Pricing section',
  type: 'document',
  fields: [
    defineField({ name: 'language', title: 'Language', type: 'string', options: { list: ['ru', 'en'] }, initialValue: 'ru' }),
    defineField({ name: 'tag', title: 'Tag', type: 'string' }),
    defineField({ name: 'title', title: 'Title', type: 'string', validation: r => r.required() }),
    defineField({ name: 'sub', title: 'Subtitle', type: 'text', rows: 3 }),
    defineField({ name: 'popular', title: 'Popular badge label', type: 'string' }),
    defineField({ name: 'cta', title: 'CTA label', type: 'string' }),
    defineField({ name: 'note', title: 'Note (optional, below plans)', type: 'text', rows: 2 }),
    defineField({
      name: 'items',
      title: 'Plans',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'name', title: 'Name', type: 'string' }),
          defineField({ name: 'subtitle', title: 'Subtitle', type: 'string' }),
          defineField({ name: 'price', title: 'Price', type: 'string' }),
          defineField({ name: 'popular', title: 'Popular', type: 'boolean', initialValue: false }),
          defineField({ name: 'features', title: 'Features', type: 'array', of: [{ type: 'string' }] }),
        ],
      }],
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'language' } },
})
