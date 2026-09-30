import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fixTemplateLines } from '@jobdekho/server/documents/template-fixes.js'
import { readDocument } from '@jobdekho/server/documents/read.js'
import { createDocument, getDocument } from '@jobdekho/store/documents.js'

const B = String.fromCharCode(92)
const template = (name) => readFileSync(fileURLToPath(new URL(`../src/resume/templates/${name}.tex`, import.meta.url)), 'utf8')
const lineOf = (tex, start) => tex.split('\n').find((line) => line.startsWith(start))

// The lines the templates wrote before the section rule was fixed, as a
// document made from them still carries them.
const OLD = {
  classic: [`${B}titleformat{${B}section}{${B}large${B}bfseries}{}{0pt}{}[{${B}vspace{-6pt}${B}hrule${B}vspace{6pt}}]`, `${B}titlespacing*{${B}section}{0pt}{10pt}{2pt}`],
  compact: [`${B}titleformat{${B}section}{${B}normalsize${B}bfseries${B}MakeUppercase}{}{0pt}{}[{${B}vspace{-5pt}${B}hrule${B}vspace{5pt}}]`, `${B}titlespacing*{${B}section}{0pt}{7pt}{2pt}`],
  academic: [`${B}titleformat{${B}section}{${B}normalsize${B}scshape}{}{0pt}{}[{${B}vspace{-6pt}${B}hrule${B}vspace{6pt}}]`, `${B}titlespacing*{${B}section}{0pt}{12pt}{3pt}`],
}

describe('fixTemplateLines', () => {
  for (const [name, [rule, spacing]] of Object.entries(OLD)) {
    it(`turns ${name}'s old section rule into exactly what the template writes now`, () => {
      const current = template(name)
      const fixed = fixTemplateLines(`preamble\n${rule}\n${spacing}\nbody`)
      expect(fixed).toBe(`preamble\n${lineOf(current, `${B}titleformat{${B}section}`)}\n${lineOf(current, `${B}titlespacing*{${B}section}`)}\nbody`)
    })

    it(`leaves ${name} as the template writes it now untouched`, () => {
      expect(fixTemplateLines(template(name))).toBe(template(name))
    })
  }

  // A person may set their own spacing; it only moves with the old rule.
  it('changes no spacing when the old rule is not there', () => {
    const own = `${B}titlespacing*{${B}section}{0pt}{10pt}{2pt}`
    expect(fixTemplateLines(own)).toBe(own)
  })
})

describe('readDocument', () => {
  const memoryStore = () => {
    const data = {}
    return { documents: { get: (id) => data[id] ?? null, set: (id, record) => { data[id] = record } } }
  }

  it('saves the fix as a version by the template, and reads a fixed document as it is', async () => {
    const store = memoryStore()
    const doc = await createDocument(store, 'u1', { name: 'CV', kind: 'resume', templateId: 'classic', tex: OLD.classic.join('\n'), by: 'template' })
    const read = await readDocument(store, 'u1', doc.id)
    expect(read.tex).toContain(`${B}titlerule`)
    expect(read.versions.map((v) => v.by)).toEqual(['template', 'template'])
    const again = await readDocument(store, 'u1', doc.id)
    expect(again.versions).toHaveLength(2)
    expect((await getDocument(store, 'u1', doc.id)).tex).toBe(read.tex)
  })

  it('never writes a document without the old lines', async () => {
    const store = memoryStore()
    const doc = await createDocument(store, 'u1', { name: 'Mine', kind: 'resume', tex: 'my own source', by: 'you' })
    expect(await readDocument(store, 'u1', doc.id)).toEqual(doc)
  })
})
