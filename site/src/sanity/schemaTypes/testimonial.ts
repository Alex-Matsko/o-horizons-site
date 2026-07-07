import { defineType, defineField } from 'sanity'

export const testimonial = defineType({
  name: 'testimonial',
  title: 'Отзыв / Testimonial',
  type: 'document',
  fields: [
    defineField({ name: 'language', title: 'Language', type: 'string', options: { list: ['ru', 'en'] }, initialValue: 'ru' }),
    defineField({ name: 'authorName', title: 'Author name', type: 'string', validation: r => r.required() }),
    defineField({ name: 'role', title: 'Role', type: 'string' }),
    defineField({ name: 'company', title: 'Company', type: 'string' }),
    defineField({ name: 'quote', title: 'Quote', type: 'text', rows: 4, validation: r => r.required() }),
    defineField({ name: 'rating', title: 'Rating (1-5)', type: 'number', validation: r => r.min(1).max(5) }),
  ],
  preview: { select: { title: 'authorName', subtitle: 'company' } },
})
