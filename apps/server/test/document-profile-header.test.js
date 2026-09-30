import { describe, it, expect } from 'vitest'
import { findHeaderCall } from '@jobdekho/server/documents/header-call.js'
import { headerUpdate, headerNotice } from '@jobdekho/server/documents/profile-header.js'
import { renderTex } from '@jobdekho/server/resume/render.js'
import { renderLetter } from '@jobdekho/server/resume/render-letter.js'
import { contactLine } from '@jobdekho/server/resume/contact.js'

const B = String.fromCharCode(92)
const ARITY = { resHeader: 3, letterHeader: 2 }
const entry = (id, title) => ({
  id, order: 0, title, organisation: 'Acme', location: '', startDate: '2023', endDate: '', bullets: ['Shipped the portal'], tech: [], link: '', pinned: false, weight: 0,
})
const BASICS = {
  name: 'Asha Rao', headline: 'Backend Engineer', email: 'demo@example.com', phone: '', location: 'Pune',
  links: { github: 'github.com/asharao', linkedin: 'linkedin.com/in/asharao' },
}
const PROFILE = {
  basics: BASICS, experience: [entry('e1', 'Engineer')], projects: [], education: [], certifications: [], achievements: [], skillGroups: [],
}
const withBasics = (over) => ({ ...PROFILE, basics: { ...BASICS, ...over } })
const LETTER_TEXT = 'Dear Hiring Team,\n\nI would like to join.\n\nRegards,\nAsha Rao'
const letter = (profile) => renderLetter('letter', { profile, text: LETTER_TEXT })
const header = (args) => `${B}resHeader${args.map((arg) => `{${arg}}`).join('')}`

describe('findHeaderCall', () => {
  it('reads the call a template wrote, links and all, past the macro\'s own definition and \\resHeaderLine', () => {
    const tex = renderTex('classic', PROFILE, {})
    expect(tex).toContain(`${B}newcommand{${B}resHeader}[3]`)
    expect(tex).toContain(`${B}resHeaderLine{3pt}`)
    const call = findHeaderCall(tex, ARITY)
    expect(call.macro).toBe('resHeader')
    expect(call.args.map((arg) => arg.text)).toEqual(['Asha Rao', 'Backend Engineer', contactLine(BASICS)])
    expect(call.args[2].text).toContain(`${B}href{https://github.com/asharao}{https://github.com/asharao}`)
    expect(tex.slice(call.args[0].start, call.args[0].end)).toBe('Asha Rao')
  })

  it('counts escaped braces as text, not as the end of an argument', () => {
    const call = findHeaderCall(header([`Asha ${B}} Rao`, `A ${B}{b${B}}`, 'x']), ARITY)
    expect(call.args.map((arg) => arg.text)).toEqual([`Asha ${B}} Rao`, `A ${B}{b${B}}`, 'x'])
  })

  it('skips a call inside a comment, and a definition written with \\def', () => {
    const tex = `% ${header(['Old', 'Old', 'Old'])}\n${B}def${B}resHeader{body}\n${header(['New', '', 'x'])}\n`
    expect(findHeaderCall(tex, ARITY).args[0].text).toBe('New')
    expect(findHeaderCall(`% ${header(['Old', 'Old', 'Old'])}\n`, ARITY)).toBeNull()
    expect(findHeaderCall(`${B}def${B}resHeader{body}`, ARITY)).toBeNull()
  })

  it('reads a call split over lines, and none from one missing an argument', () => {
    expect(findHeaderCall(`${B}resHeader{A}\n  {B}\n  {C}`, ARITY).args.map((arg) => arg.text)).toEqual(['A', 'B', 'C'])
    expect(findHeaderCall(`${B}resHeader{A}{B} and then text`, ARITY)).toBeNull()
    expect(findHeaderCall(`${B}resHeader{A}{B}{C`, ARITY)).toBeNull()
  })
})

describe('headerUpdate', () => {
  for (const templateId of ['classic', 'compact', 'academic']) {
    it(`has nothing to offer a ${templateId} resume made from the same profile`, () => {
      expect(headerUpdate(renderTex(templateId, PROFILE, {}), PROFILE)).toBeNull()
    })

    it(`names each changed part of a ${templateId} header and replaces only those`, () => {
      const tex = renderTex(templateId, PROFILE, {})
      const cases = [
        [{ name: 'Asha R. Rao' }, ['Name']],
        [{ headline: 'Staff Engineer' }, ['Headline']],
        [{ email: 'asha@example.com' }, ['Contact line']],
        [{ name: 'A. Rao', headline: '', phone: '+91 98000 00000' }, ['Name', 'Headline', 'Contact line']],
      ]
      for (const [over, fields] of cases) {
        const update = headerUpdate(tex, withBasics(over))
        expect(update.fields).toEqual(fields)
        // The body is the same profile's, so the whole file must now be
        // exactly what the template makes from the new profile.
        expect(update.tex).toBe(renderTex(templateId, withBasics(over), {}))
      }
    })
  }

  it('leaves every byte outside the header alone, including a person\'s own edits', () => {
    const tex = renderTex('classic', PROFILE, {}).replace('Shipped the portal', 'Shipped the portal, by hand % my note')
    const update = headerUpdate(tex, withBasics({ name: 'Asha Menon' }))
    expect(update.tex).toBe(tex.replace(`${B}resHeader{Asha Rao}`, `${B}resHeader{Asha Menon}`))
    expect(update.tex).toContain('by hand % my note')
  })

  it('escapes the new values the way the templates do, and never reads them as replacement patterns', () => {
    const update = headerUpdate(renderTex('classic', PROFILE, {}), withBasics({ name: 'Asha $& Rao_1' }))
    expect(update.tex).toContain(`${B}resHeader{Asha ${B}$${B}& Rao${B}_1}`)
  })

  it('sees only layout, not a change, in a header split over lines', () => {
    const tex = renderTex('classic', PROFILE, {}).replace(`${B}resHeader{Asha Rao}{`, `${B}resHeader{ Asha Rao }\n  {`)
    expect(headerUpdate(tex, PROFILE)).toBeNull()
    expect(headerUpdate(tex, withBasics({ headline: 'Lead' })).tex).toContain(`${B}resHeader{ Asha Rao }\n  {Lead}`)
  })

  it('offers nothing when the person deleted the header call, or there is no profile', () => {
    const tex = renderTex('classic', PROFILE, {})
    const without = tex.split('\n').filter((line) => !line.startsWith(`${B}resHeader{`)).join('\n')
    expect(headerUpdate(without, withBasics({ name: 'Asha Menon' }))).toBeNull()
    expect(headerUpdate(tex, null)).toBeNull()
  })

  it('updates a cover letter\'s name and contact line', () => {
    expect(headerUpdate(letter(PROFILE), PROFILE)).toBeNull()
    const moved = withBasics({ location: 'Bengaluru' })
    const update = headerUpdate(letter(PROFILE), moved)
    expect(update.fields).toEqual(['Contact line'])
    expect(update.tex).toBe(letter(moved))
    expect(headerUpdate(letter(PROFILE), withBasics({ name: 'Asha Menon' })).fields).toEqual(['Name'])
  })

  // The sign-off is the letter's own text, but it is the same name, so it
  // moves with the header rather than signing a new header with the old one.
  it('carries a new name into the letter\'s sign-off, whole words only', () => {
    const renamed = withBasics({ name: 'Asha Menon' })
    const signed = renderLetter('letter', { profile: PROFILE, text: `${LETTER_TEXT}\nAsha Raoji wrote this` })
    const { tex } = headerUpdate(signed, renamed)
    expect(tex).toContain('Regards,')
    expect(tex).not.toMatch(/Asha Rao(?!ji)/)
    expect(tex).toContain('Asha Menon')
    expect(tex).toContain('Asha Raoji wrote this')
    expect(headerUpdate(letter(PROFILE), renamed).tex).toBe(renderLetter('letter', { profile: renamed, text: LETTER_TEXT.replace('Asha Rao', 'Asha Menon') }))
  })

  it('leaves the body alone when only the contact line changed', () => {
    const { tex } = headerUpdate(letter(PROFILE), withBasics({ location: 'Bengaluru' }))
    expect(tex).toContain('Asha Rao')
  })
})

describe('headerNotice', () => {
  const doc = (over = {}) => ({ tex: renderTex('classic', PROFILE, {}), ...over })

  it('names the changed parts, until the person keeps their header against that very profile', () => {
    const renamed = withBasics({ name: 'Asha Menon' })
    expect(headerNotice(doc(), PROFILE)).toBeNull()
    expect(headerNotice(doc(), renamed)).toEqual({ fields: ['Name'] })
    const kept = doc({ headerKept: headerUpdate(doc().tex, renamed).rendered })
    expect(headerNotice(kept, renamed)).toBeNull()
    expect(headerNotice(kept, withBasics({ name: 'Asha Menon', email: 'menon@example.com' }))).toEqual({ fields: ['Name', 'Contact line'] })
  })
})
