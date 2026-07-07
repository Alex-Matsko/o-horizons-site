import { defineType, defineField } from 'sanity'

export const faqSection = defineType({
  name: 'faqSection',
  title: 'FAQ',
  type: 'document',
  fields: [
    defineField({ name: 'language', title: 'Language', type: 'string', options: { list: ['ru', 'en'] }, initialValue: 'ru' }),
    defineField({ name: 'tag', title: 'Tag', type: 'string' }),
    defineField({ name: 'title', title: 'Title', type: 'string', validation: r => r.required() }),
    defineField({
      name: 'items',
      title: 'Questions',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'q', title: 'Question', type: 'text', rows: 2 }),
          defineField({ name: 'a', title: 'Answer', type: 'text', rows: 4 }),
        ],
      }],
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'language' } },
})
