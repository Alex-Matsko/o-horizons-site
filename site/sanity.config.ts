import { defineConfig } from 'sanity'
import { deskTool } from 'sanity/desk'
import { schemaTypes } from './src/sanity/schemaTypes'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'replace-with-project-id'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

export default defineConfig({
  basePath: '/studio',
  name: 'o-horizons',
  title: 'Open Horizons CMS',
  projectId,
  dataset,
  plugins: [deskTool()],
  schema: { types: schemaTypes },
})
