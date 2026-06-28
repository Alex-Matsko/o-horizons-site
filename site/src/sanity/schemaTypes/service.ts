import { defineType, defineField } from 'sanity'

export const service = defineType({
  name: 'service',
  title: 'Услуга / Service',
  type: 'document',
  fields: [
    defineField({ name: 'language', title: 'Language', type: 'string', options: { list: ['ru', 'en'] }, initialValue: 'ru' }),
    defineField({ name: 'title', title: 'Title', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' }, validation: r => r.required() }),
    defineField({ name: 'icon', title: 'Icon (emoji)', type: 'string' }),
    defineField({ name: 'shortDescription', title: 'Short description', type: 'text', rows: 2 }),
    defineField({ name: 'body', title: 'Full description', type: 'array', of: [{ type: 'block' }] }),
  ],
  preview: { select: { title: 'title', subtitle: 'icon' } },
})
