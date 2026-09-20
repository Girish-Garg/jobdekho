import { readFileSync } from 'node:fs'
import { escapeLine, texLink } from './escape.js'
import { applySelection } from './selection.js'
import { buildEntrySection, buildSkillsSection } from './sections.js'
import { isKnownTemplate, templatePath } from './templates/registry.js'

const SECTION_TITLES = {
  experience: 'Experience', projects: 'Projects', education: 'Education',
  certifications: 'Certifications', achievements: 'Achievements',
}

// Most profiles hold a link as typed from a browser bar ("github.com/x"),
// with no scheme, which the SAFE_URL check in texLink would otherwise reject
// outright. Adding https:// when one is missing is the only normalisation
// this file does to a link; anything already carrying a scheme is left alone.
const withScheme = (value) => (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`)

function contactLine(basics) {
  const plain = [basics.location, basics.email, basics.phone].filter(Boolean).map(escapeLine)
  const links = [basics.links?.github, basics.links?.linkedin, basics.links?.portfolio]
    .filter(Boolean)
    .map((value) => texLink(withScheme(value)))
  return [...plain, ...links].filter(Boolean).join(' | ')
}

function buildBody(picked) {
  const sections = [
    buildEntrySection(SECTION_TITLES.experience, picked.experience),
    buildEntrySection(SECTION_TITLES.projects, picked.projects),
    buildEntrySection(SECTION_TITLES.education, picked.education),
    buildSkillsSection('Skills', picked.skillGroups),
    buildEntrySection(SECTION_TITLES.certifications, picked.certifications),
    buildEntrySection(SECTION_TITLES.achievements, picked.achievements),
  ]
  return sections.filter(Boolean).join('\n\n')
}

// A single pass over the ORIGINAL template text: each @@TOKEN@@ is replaced
// from a lookup, so a value that itself happens to contain the literal text
// "@@BODY@@" (a name pasted from somewhere strange) is never rescanned and
// substituted a second time. Doing this as four sequential .replace() calls
// instead would have exactly that bug.
function fill(tex, values) {
  return tex.replace(/@@([A-Z]+)@@/g, (_, key) => values[key] ?? '')
}

// The public entry point the API route - and, later, the job-specific
// builder - calls: a profile plus a template choice plus which entries to
// include (see selection.js) becomes one .tex document, fully escaped, ready
// to hand to resume/compile.js. Throws on an unknown template id; every
// profile value is escaped before it reaches the page, so this never needs
// to trust its caller.
export function renderTex(templateId, profile, sections) {
  if (!isKnownTemplate(templateId)) throw new Error(`unknown resume template: ${templateId}`)
  const picked = applySelection(profile, sections)
  const raw = readFileSync(templatePath(templateId), 'utf8')
  return fill(raw, {
    NAME: escapeLine(picked.basics.name) || 'Your Name',
    HEADLINE: escapeLine(picked.basics.headline),
    CONTACT: contactLine(picked.basics),
    BODY: buildBody(picked),
  })
}
