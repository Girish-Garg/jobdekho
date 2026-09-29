import { describe, it, expect } from 'vitest'
import { validateProposals } from '@jobdekho/server/chat/proposals.js'
import { validateDocumentProposal } from '@jobdekho/server/chat/document-proposal.js'
import { renderTex } from '@jobdekho/server/resume/render.js'
import { PROFILE_SHAPES } from '@jobdekho/server/resume/check-shapes.js'

const record = PROFILE_SHAPES['everything filled']
const TEX = renderTex('classic', record, {})
const open = { id: 'd1', name: 'Classic resume', kind: 'resume', tex: TEX, truncated: false, baseAt: '2026-09-30T10:00:00.000Z' }
const resumePage = { page: 'resume', record, documents: [{ id: 'd1' }], document: open }
const addProject = { kind: 'profile', summary: 'Add a project', ops: [{ op: 'add', section: 'projects', entry: { title: 'CLI tool' } }] }
const tighter = TEX.replace('margin=0.75in', 'margin=0.5in')

describe('validateDocumentProposal', () => {
  it('rewrites the open document, with the guard\'s verdict and the facts it could not find', () => {
    const proposal = validateDocumentProposal({ documentId: 'd1', tex: tighter, name: 'Renamed?' }, resumePage)
    expect(proposal).toEqual({
      kind: 'document', documentId: 'd1', documentKind: 'resume', name: 'Classic resume', baseAt: open.baseAt,
      tex: tighter, factFlags: [], problems: [],
    })
  })

  it('stores a source the guard refuses, with its problems, and flags invented claims', () => {
    const bad = tighter.replace('\\end{document}', 'Led 12 engineers at Google.\n\\input{secret}\n\\end{document}')
    const proposal = validateDocumentProposal({ documentId: 'd1', tex: bad }, resumePage)
    expect(proposal.problems).toEqual(['"\\input" reads files from this computer, so it is not allowed in a document.'])
    expect(proposal.factFlags).toEqual(expect.arrayContaining(['12']))
  })

  it('strips a markdown fence the model wrapped the source in', () => {
    expect(validateDocumentProposal({ documentId: 'd1', tex: `\`\`\`latex\n${tighter}\n\`\`\`` }, resumePage).tex).toBe(tighter)
  })

  it('rewrites only the open document, never one it did not see, a cut one, or with the same text', () => {
    expect(validateDocumentProposal({ documentId: 'd2', tex: tighter }, resumePage)).toBeNull()
    expect(validateDocumentProposal({ documentId: 'd1', tex: tighter }, { ...resumePage, document: null })).toBeNull()
    expect(validateDocumentProposal({ documentId: 'd1', tex: tighter }, { ...resumePage, document: { ...open, truncated: true } })).toBeNull()
    expect(validateDocumentProposal({ documentId: 'd1', tex: TEX }, resumePage)).toBeNull()
    expect(validateDocumentProposal({ documentId: 'd1', tex: '   ' }, resumePage)).toBeNull()
  })

  it('proposes a new document with a name and a kind, defaulting both', () => {
    expect(validateDocumentProposal({ documentId: null, tex: tighter, name: 'For startups', documentKind: 'resume' }, resumePage))
      .toMatchObject({ documentId: null, documentKind: 'resume', name: 'For startups', baseAt: null })
    expect(validateDocumentProposal({ tex: tighter, documentKind: 'essay' }, resumePage)).toMatchObject({ documentKind: 'resume', name: 'Resume' })
    expect(validateDocumentProposal({ tex: tighter, documentKind: 'cover-letter' }, resumePage).name).toBe('Cover letter')
  })
})

describe('validateProposals', () => {
  it('stores each proposal pending, under an id of the server\'s', () => {
    const [proposal] = validateProposals([{ ...addProject, id: 'model-id', status: 'applied' }], { page: 'profile', record })
    expect(proposal).toMatchObject({ kind: 'profile', summary: 'Add a project', status: 'pending' })
    expect(proposal.id).not.toBe('model-id')
    expect(proposal.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('lets a page propose only what its context showed the model', () => {
    const doc = { kind: 'document', documentId: 'd1', tex: tighter }
    expect(validateProposals([addProject, doc], { page: 'profile', record })).toHaveLength(1)
    expect(validateProposals([addProject, doc], resumePage).map((p) => p.kind)).toEqual(['profile', 'document'])
    expect(validateProposals([addProject, doc], { page: 'postings', record })).toEqual([])
    expect(validateProposals([addProject], { page: 'settings' })).toEqual([])
    expect(validateProposals([addProject], {})).toEqual([])
    expect(validateProposals('not a list', resumePage)).toEqual([])
  })

  it('offers one document rewrite per turn and three proposals at most', () => {
    const doc = { kind: 'document', documentId: 'd1', tex: tighter }
    expect(validateProposals([doc, { ...doc, tex: `${tighter}\n` }], resumePage)).toHaveLength(1)
    expect(validateProposals(Array.from({ length: 6 }, () => addProject), resumePage)).toHaveLength(3)
  })

  it('keeps the summary to one plain line, or writes a plain one', () => {
    const [long] = validateProposals([{ ...addProject, summary: `Add\n${'x'.repeat(300)}` }], { page: 'profile', record })
    expect(long.summary).toHaveLength(160)
    expect(long.summary).not.toContain('\n')
    expect(validateProposals([{ ...addProject, summary: 7 }], { page: 'profile', record })[0].summary).toBe('Change your profile')
    expect(validateProposals([{ kind: 'document', documentId: 'd1', tex: tighter }], resumePage)[0].summary).toBe('New version of Classic resume')
  })
})
