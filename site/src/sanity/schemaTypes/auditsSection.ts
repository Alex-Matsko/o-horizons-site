import { defineType, defineField } from 'sanity'

export const auditsSection = defineType({
  name: 'auditsSection',
  title: 'Секция аудитов / Audits section',
  type: 'document',
  fields: [
    defineField({ name: 'language', title: 'Language', type: 'string', options: { list: ['ru', 'en'] }, initialValue: 'ru' }),
    defineField({ name: 'tag', title: 'Tag', type: 'string' }),
    defineField({ name: 'title', title: 'Title', type: 'string', validation: r => r.required() }),
    defineField({ name: 'sub', title: 'Subtitle', type: 'text', rows: 3 }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'title', title: 'Title', type: 'string' }),
          defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
          defineField({ name: 'price', title: 'Price', type: 'string' }),
        ],
      }],
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'language' } },
})
