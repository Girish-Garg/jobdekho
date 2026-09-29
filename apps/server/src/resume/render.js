import { readFileSync } from 'node:fs'
import { escapeLine } from './escape.js'
import { fill } from './fill.js'
import { contactLine } from './contact.js'
import { applySelection } from './selection.js'
import { buildEntrySection, buildSkillsSection } from './sections.js'
import { isKnownTemplate, templatePath } from './templates/registry.js'

const SECTION_TITLES = {
  experience: 'Experience', projects: 'Projects', education: 'Education',
  certifications: 'Certifications', achievements: 'Achievements',
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
