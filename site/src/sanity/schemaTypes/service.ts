import { defineType, defineField } from 'sanity'
import { slugIsUniqueWithinLanguage } from '../lib/slugIsUniqueWithinLanguage'

export const service = defineType({
  name: 'service',
  title: 'Услуга / Service',
  type: 'document',
  fields: [
    defineField({ name: 'language', title: 'Language', type: 'string', options: { list: ['ru', 'en'] }, initialValue: 'ru' }),
    defineField({ name: 'title', title: 'Title', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title', isUnique: slugIsUniqueWithinLanguage }, validation: r => r.required() }),
    defineField({ name: 'icon', title: 'Icon (emoji)', type: 'string' }),
    defineField({ name: 'shortDescription', title: 'Short description', type: 'text', rows: 2 }),
    defineField({ name: 'audience', title: 'Кому подходит / Who it is for', type: 'text', rows: 3 }),
    defineField({ name: 'problems', title: 'Какие проблемы решает / Problems it solves', type: 'array', of: [{ type: 'string' }] }),
    defineField({ name: 'included', title: 'Что входит / What is included', type: 'array', of: [{ type: 'string' }] }),
    defineField({ name: 'result', title: 'Результат / Outcome', type: 'text', rows: 3 }),
    defineField({ name: 'body', title: 'Full description', type: 'array', of: [{ type: 'block' }] }),
  ],
  preview: { select: { title: 'title', subtitle: 'icon' } },
})
