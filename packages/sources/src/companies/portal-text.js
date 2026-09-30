import { stripHtml } from '../html.js'

// Portals keep the body in several fields (about, responsibilities,
// qualifications), and the requirements are where the degree and years of
// experience are stated, so they are joined into one plain-text body under
// their own headings. [heading, htmlOrText] pairs; an empty one is dropped.
export function sections(parts) {
  return parts
    .map(([title, html]) => ({ title, text: stripHtml(html || '') }))
    .filter(({ text }) => text)
    .map(({ title, text }) => [title, text].filter(Boolean).join('\n\n'))
    .join('\n\n')
}

// core's location rule reads "India" as a whole word, and a bare Indian city
// it has no name for ("Coimbatore", "Greater Noida") would fail it. Every
// posting these adapters return was listed under the portal's own India
// filter, so saying so is safe where the portal did not.
export function inIndia(place) {
  const text = String(place || '').trim()
  if (!text) return 'India'
  return /\bindia\b/i.test(text) ? text : `${text}, India`
}

// Some portals shout their cities ("BANGALORE", "PUNE     ").
export const titleCase = (s) =>
  String(s || '').trim().toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, lead, c) => lead + c.toUpperCase())
