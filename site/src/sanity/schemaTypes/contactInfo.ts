import { defineType, defineField } from 'sanity'

export const contactInfo = defineType({
  name: 'contactInfo',
  title: 'Контакты / Contact info',
  type: 'document',
  fields: [
    defineField({ name: 'language', title: 'Language', type: 'string', options: { list: ['ru', 'en'] }, initialValue: 'ru' }),
    defineField({ name: 'tag', title: 'Tag', type: 'string' }),
    defineField({ name: 'title', title: 'Title', type: 'string', validation: r => r.required() }),
    defineField({ name: 'sub', title: 'Subtitle', type: 'text', rows: 3 }),
    defineField({ name: 'cta', title: 'CTA label', type: 'string' }),
    defineField({ name: 'email', title: 'Email', type: 'string' }),
    defineField({ name: 'telegram', title: 'Telegram handle', type: 'string' }),
    defineField({ name: 'phone', title: 'Phone', type: 'string' }),
    defineField({ name: 'emailLabel', title: 'Email label', type: 'string' }),
    defineField({ name: 'telegramLabel', title: 'Telegram label', type: 'string' }),
    defineField({ name: 'phoneLabel', title: 'Phone label', type: 'string' }),
  ],
  preview: { select: { title: 'title', subtitle: 'language' } },
})
