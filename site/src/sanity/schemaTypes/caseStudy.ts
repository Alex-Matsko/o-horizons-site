import { defineType, defineField } from 'sanity'

export const caseStudy = defineType({
  name: 'caseStudy',
  title: 'Кейс / Case Study',
  type: 'document',
  fields: [
    defineField({ name: 'language', title: 'Language', type: 'string', options: { list: ['ru', 'en'] }, initialValue: 'ru' }),
    defineField({ name: 'title', title: 'Title', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' }, validation: r => r.required() }),
    defineField({ name: 'excerpt', title: 'Excerpt', type: 'text', rows: 3 }),
    defineField({ name: 'industry', title: 'Industry', type: 'string' }),
    defineField({ name: 'result', title: 'Key result', type: 'string' }),
    defineField({ name: 'body', title: 'Body', type: 'array', of: [{ type: 'block' }] }),
  ],
  preview: { select: { title: 'title', subtitle: 'industry' } },
})
