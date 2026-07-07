import { defineType, defineField } from 'sanity'

export const hero = defineType({
  name: 'hero',
  title: 'Главный экран / Hero',
  type: 'document',
  fields: [
    defineField({ name: 'language', title: 'Language', type: 'string', options: { list: ['ru', 'en'] }, initialValue: 'ru' }),
    defineField({ name: 'tag', title: 'Tag', type: 'string' }),
    defineField({ name: 'title', title: 'Title', type: 'string', validation: r => r.required() }),
    defineField({ name: 'sub1', title: 'Subtitle 1', type: 'text', rows: 3 }),
    defineField({ name: 'sub2', title: 'Subtitle 2', type: 'text', rows: 3 }),
    defineField({ name: 'cta', title: 'CTA label', type: 'string' }),
    defineField({ name: 'ctaOutline', title: 'Secondary CTA label', type: 'string' }),
    defineField({
      name: 'stats',
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
    defineField({
      name: 'serverCard',
      title: 'Server card',
      type: 'object',
      fields: [
        defineField({ name: 'lines', title: 'Lines', type: 'array', of: [{ type: 'string' }] }),
        defineField({ name: 'footer', title: 'Footer', type: 'string' }),
      ],
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'language' } },
})
