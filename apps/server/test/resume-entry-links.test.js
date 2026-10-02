import { describe, it, expect } from 'vitest'
import { renderTex } from '@jobdekho/server/resume/render.js'
import { texNamedLink } from '@jobdekho/server/resume/escape.js'
import { contactLine } from '@jobdekho/server/resume/contact.js'
import { checkTex } from '@jobdekho/server/resume/guard/check.js'
import { listTemplates } from '@jobdekho/server/resume/templates/registry.js'
import { PROFILE_SHAPES } from '@jobdekho/server/resume/check-shapes.js'

const B = '\\'
const shape = PROFILE_SHAPES['links on an entry and in the header']

describe('an entry\'s links on the resume', () => {
  it('prints them by name on one line right under the title, before the bullets', () => {
    const tex = renderTex('classic', shape, {})
    const line = `${B}resMetaLine{${B}href{https://github.com/demo/tracker}{Code} ${B}textperiodcentered{} `
      + `${B}href{https://youtu.be/abc123}{Demo video ${B}& slides${B}_1} ${B}textperiodcentered{} https://tracker.example.dev/${B}#home}`
    expect(tex).toContain(`${B}resEntryHeaderPlain{Job tracker}{2024}\n${line}\n${B}begin{resItems}`)
  })

  it('names an unlabelled link by its kind, and an unlabelled "other" as Link', () => {
    const profile = { ...shape, projects: [{ ...shape.projects[0], links: [{ kind: 'paper', url: 'https://arxiv.org/abs/1', label: '' }, { kind: 'other', url: 'https://demo.dev', label: '' }] }] }
    expect(renderTex('classic', profile, {})).toContain(`{${B}href{https://arxiv.org/abs/1}{Paper} ${B}textperiodcentered{} ${B}href{https://demo.dev}{Link}}`)
  })

  it('prints no link line for an entry without links', () => {
    const profile = { ...shape, projects: [{ ...shape.projects[0], links: [] }] }
    expect(renderTex('classic', profile, {})).toContain(`${B}resEntryHeaderPlain{Job tracker}{2024}\n${B}begin{resItems}`)
  })

  it('is accepted by the LaTeX guard in every template', () => {
    for (const { id } of listTemplates()) expect(checkTex(renderTex(id, shape, {}))).toEqual({ ok: true, problems: [] })
  })
})

describe('texNamedLink', () => {
  it('links a safe address under its escaped name', () => {
    expect(texNamedLink(' https://x.dev/a?b=c&d=e ', 'Demo & more')).toBe(`${B}href{https://x.dev/a?b=c&d=e}{Demo ${B}& more}`)
    expect(texNamedLink('https://x.dev', '')).toBe(`${B}href{https://x.dev}{https://x.dev}`)
  })

  // The name is only ever text: a brace or a command in it is escaped, and
  // an address that is not a clean web link never reaches \href at all.
  it('never lets a name or an address break out of the link', () => {
    expect(texNamedLink('https://x.dev', '}{\\input{/etc/passwd}')).toBe(`${B}href{https://x.dev}{${B}}${B}{${B}textbackslash{}input${B}{/etc/passwd${B}}}`)
    for (const url of ['https://x.dev/}{\\input{x}', 'javascript:alert(1)', 'https://x.dev/a%20b']) {
      expect(texNamedLink(url, 'Code')).not.toContain(`${B}href`)
    }
    expect(texNamedLink('', 'Code')).toBe('')
  })
})

describe('the contact line', () => {
  it('follows the three named links with the person\'s other profiles, each as its address', () => {
    const basics = { email: 'demo@example.com', links: { github: 'github.com/demo' }, moreLinks: [{ kind: 'kaggle', url: 'https://www.kaggle.com/demo', label: 'Kaggle' }] }
    expect(contactLine(basics)).toBe(`demo@example.com | ${B}href{https://github.com/demo}{https://github.com/demo} | ${B}href{https://www.kaggle.com/demo}{https://www.kaggle.com/demo}`)
    expect(contactLine({ email: 'demo@example.com', moreLinks: 'not a list' })).toBe('demo@example.com')
  })
})
