import { defineType, defineField } from 'sanity'

export const article = defineType({
  name: 'article',
  title: 'Статья / Article',
  type: 'document',
  fields: [
    defineField({ name: 'language', title: 'Language', type: 'string', options: { list: ['ru', 'en'] }, initialValue: 'ru' }),
    defineField({ name: 'title', title: 'Title', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' }, validation: r => r.required() }),
    defineField({ name: 'excerpt', title: 'Excerpt', type: 'text', rows: 3 }),
    defineField({ name: 'publishedAt', title: 'Published at', type: 'datetime', initialValue: () => new Date().toISOString() }),
    defineField({ name: 'body', title: 'Body', type: 'array', of: [{ type: 'block' }] }),
  ],
  preview: { select: { title: 'title', subtitle: 'language' } },
})
