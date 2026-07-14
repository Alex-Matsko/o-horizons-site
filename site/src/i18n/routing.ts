import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['ru', 'en'],
  defaultLocale: 'ru',
  localePrefix: 'as-needed',
  // Without this, next-intl's middleware redirects "/" based on the
  // request's Accept-Language before rendering anything — link-preview
  // crawlers (Telegram, VK, Open Graph validators) often don't follow that
  // redirect the same way a browser does, so they see no meta tags at all.
  localeDetection: false,
})

export type Locale = (typeof routing.locales)[number]
