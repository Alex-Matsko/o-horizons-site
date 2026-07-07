import { defineType, defineField } from 'sanity'

export const servicesSection = defineType({
  name: 'servicesSection',
  title: 'Секция услуг (главная) / Services section',
  type: 'document',
  fields: [
    defineField({ name: 'language', title: 'Language', type: 'string', options: { list: ['ru', 'en'] }, initialValue: 'ru' }),
    defineField({ name: 'tag', title: 'Tag', type: 'string' }),
    defineField({ name: 'title', title: 'Title', type: 'string', validation: r => r.required() }),
  ],
  preview: { select: { title: 'title', subtitle: 'language' } },
})
