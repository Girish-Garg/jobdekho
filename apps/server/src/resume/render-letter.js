import { readFileSync } from 'node:fs'
import { escapeLine } from './escape.js'
import { fill } from './fill.js'
import { contactLine } from './contact.js'
import { isLetterTemplate, templatePath } from './templates/registry.js'

// A cover letter's text becomes LaTeX here, and only here, escaped line by
// line the way the resume renderer escapes an entry (see escape.js), so a
// letter that mentions "C#", "100%" or "R&D" prints those characters rather
// than running them as commands.
//
// Paragraphs are split on blank lines. A single line break inside one (the
// "Regards," above a name) is kept as a forced break, joined BETWEEN lines so
// a paragraph never ends on a break with no line after it. It is \newline
// rather than a double backslash, which would read a next line starting with
// "[" as its own spacing argument.
function body(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.split('\n').map(escapeLine).filter(Boolean).join('\\newline\n'))
    .filter(Boolean)
    .join('\n\n')
}

// Who the letter goes to, from the posting's own fields; nothing when there
// is no posting, which the template prints as nothing at all.
function recipient(posting) {
  if (!posting) return ''
  return ['Hiring Team', posting.company, posting.location].filter(Boolean).map(escapeLine).join('\\newline ')
}

// The words used when there is no letter yet: enough structure to show
// where things go, and a pointer to the chat, which can draft the rest.
export function placeholderLetter(profile, posting) {
  const to = posting?.company ? `Dear Hiring Team at ${posting.company},` : 'Dear Hiring Team,'
  const role = posting?.title ? ` for the ${posting.title} role` : ''
  const name = profile?.basics?.name || 'Your Name'
  return `${to}\n\nWrite your letter${role} here, or ask the chat to draft it from your profile.\n\nRegards,\n${name}`
}

export function renderLetter(templateId, { profile, posting = null, text }) {
  if (!isLetterTemplate(templateId)) throw new Error(`unknown letter template: ${templateId}`)
  const basics = profile?.basics ?? {}
  return fill(readFileSync(templatePath(templateId), 'utf8'), {
    NAME: escapeLine(basics.name) || 'Your Name',
    CONTACT: contactLine(basics),
    RECIPIENT: recipient(posting),
    BODY: body(text),
  })
}
