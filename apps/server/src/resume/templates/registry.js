import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))

// Three ATS-safe layouts: one column, standard section headings, no tables,
// no multi-column text flow, selectable text throughout. They share one
// renderer and one set of placeholder tokens (see resume/render.js), so
// choosing between them only ever changes typography and spacing, never
// what a screen reader or an applicant-tracking parser sees.
export const TEMPLATES = [
  { id: 'classic', name: 'Classic', description: 'One-column serif with generous spacing. The safe default.' },
  { id: 'compact', name: 'Compact', description: 'Tighter modern sans that fits more onto one page.' },
  { id: 'academic', name: 'Academic', description: 'Formal serif suited to a research or teaching record.' },
]

const byId = new Map(TEMPLATES.map((t) => [t.id, t]))

export const isKnownTemplate = (id) => byId.has(id)
export const listTemplates = () => TEMPLATES
export const templateById = (id) => byId.get(id) ?? null
export const templatePath = (id) => join(HERE, `${id}.tex`)

// The cover letter's own layout, kept apart from TEMPLATES because the
// resume builder lists those and a letter is not a resume layout. Filled by
// resume/render-letter.js from the same escaping helpers as the resumes.
export const LETTER_TEMPLATES = [
  { id: 'letter', name: 'Letter', description: 'A plain one-page letter set like the Classic resume.' },
]

export const isLetterTemplate = (id) => LETTER_TEMPLATES.some((t) => t.id === id)
