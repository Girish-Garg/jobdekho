import { describe, it, expect, vi } from 'vitest'
import { assembleChatContext } from '@jobdekho/server/chat/context.js'

const row = (n) => ({ id: `p${n}`, title: `Job ${n}`, company: 'Acme', location: 'Pune', level: 'mid', fit: 50 + n, grade: 'B' })

function fakeDashboard({ postings = [], profile = null, open = null, saved = [] } = {}) {
  return {
    getProfile: vi.fn().mockResolvedValue(profile),
    listPostingsForUser: vi.fn().mockResolvedValue(postings),
    getPosting: vi.fn().mockResolvedValue(open),
    listAiResults: vi.fn().mockResolvedValue(saved),
  }
}

describe('assembleChatContext', () => {
  it('counts every matching posting and lists only the top 25, compact', async () => {
    const rows = Array.from({ length: 30 }, (_, i) => row(i))
    const dashboard = fakeDashboard({ postings: rows })
    const context = await assembleChatContext(dashboard, 'u1', { filters: {}, sort: 'match' })
    expect(context.postingCount).toBe(30)
    expect(context.top).toHaveLength(25)
    // Pay and work mode are on the row the person is already looking at, and
    // without them the chat had to answer "I cannot tell" to a question the
    // feed itself answers, so they ride the compact list too.
    expect(context.top[0]).toEqual({
      id: 'p0', title: 'Job 0', company: 'Acme', location: 'Pune', level: 'mid',
      workMode: null, pay: null, fit: 50, grade: 'B',
    })
  })

  it('carries the pay and the work mode a row shows, so the chat can answer about them', async () => {
    const rows = [{ ...row(0), workMode: 'remote', stipend: 'Rs 24,00,000 - 45,00,000 /year' }]
    const context = await assembleChatContext(fakeDashboard({ postings: rows }), 'u1', { filters: {}, sort: 'match' })
    expect(context.top[0]).toMatchObject({ workMode: 'remote', pay: 'Rs 24,00,000 - 45,00,000 /year' })
  })

  it('carries the open posting in full, trimmed, when an id is given', async () => {
    const open = {
      id: 'p9', title: 'Staff Engineer', company: 'Acme', location: 'Pune', level: 'staff', workMode: 'remote',
      stipend: 'Rs 30 LPA', degreeMin: 'bachelors', degreeRequired: true, duration: null, experience: '5+ years',
      source: 'linkedin', postedAt: '2026-09-01T00:00:00.000Z', status: 'saved', legitimacy: 'high',
      ghostSignals: [], descriptionText: 'x'.repeat(5000),
    }
    const dashboard = fakeDashboard({ open })
    const context = await assembleChatContext(dashboard, 'u1', { filters: {}, sort: 'newest', openPostingId: 'p9' })
    expect(dashboard.getPosting).toHaveBeenCalledWith('u1', 'p9')
    expect(context.open.id).toBe('p9')
    expect(context.open.description).toHaveLength(4000)
  })

  it('carries what the actions already said about the scoped posting, newest answer of each', async () => {
    const open = { id: 'p9', title: 'Staff Engineer', company: 'Acme', ghostSignals: [] }
    const saved = [
      { kind: 'fake-check', postingId: 'p9', result: { verdict: 'likely_scam', summary: 'No office.', stillOpen: false, redFlags: ['asks for a fee'] } },
      { kind: 'cover-letter', postingId: 'p9', result: { letter: 'Dear team,' } },
      { kind: 'resume-tailor', postingId: 'p9', result: { factCheck: { flags: [{ type: 'number', value: '40%' }] }, coverage: { before: 2, after: 4, total: 6, gained: [] } } },
    ]
    const dashboard = fakeDashboard({ open, saved })
    const context = await assembleChatContext(dashboard, 'u1', { filters: {}, sort: 'match', openPostingId: 'p9' })
    expect(dashboard.listAiResults).toHaveBeenCalledWith('u1', 'p9')
    expect(context.openResults).toEqual({
      'fake-check': { verdict: 'likely_scam', summary: 'No office.', stillOpen: false, redFlags: ['asks for a fee'] },
      'cover-letter': { letter: 'Dear team,' },
      'resume-tailor': { thingsToCheck: ['40%'], coverage: { before: 2, after: 4, total: 6 } },
    })
  })

  it('says nothing about saved answers when the scoped posting has none, or nothing is scoped', async () => {
    const scoped = await assembleChatContext(fakeDashboard({ open: { id: 'p9' } }), 'u1', { openPostingId: 'p9' })
    expect(scoped.openResults).toBeNull()
    const dashboard = fakeDashboard()
    const unscoped = await assembleChatContext(dashboard, 'u1', {})
    expect(unscoped.openResults).toBeNull()
    expect(dashboard.listAiResults).not.toHaveBeenCalled()
  })

  it('leaves the open posting null when nothing is open, without asking the store for one', async () => {
    const dashboard = fakeDashboard()
    const context = await assembleChatContext(dashboard, 'u1', { filters: {}, sort: 'newest' })
    expect(dashboard.getPosting).not.toHaveBeenCalled()
    expect(context.open).toBeNull()
  })

  it('summarises the career record rather than sending it whole', async () => {
    const profile = {
      skills: ['react', 'node'], titles: ['Frontend Engineer'], years: 3, degree: 'bachelors',
      experience: [{ id: 'e1' }], projects: [{ id: 'p1' }, { id: 'p2' }], education: [{ id: 'ed1' }],
      resumeText: 'SECRET RESUME TEXT', basics: { name: 'Jane Doe' },
    }
    const dashboard = fakeDashboard({ profile })
    const context = await assembleChatContext(dashboard, 'u1', { filters: {}, sort: 'newest' })
    expect(context.profile).toEqual({
      skills: ['react', 'node'], titles: ['Frontend Engineer'], years: 3, degree: 'bachelors',
      experienceCount: 1, projectsCount: 2, educationCount: 1,
    })
    expect(JSON.stringify(context.profile)).not.toContain('SECRET')
    expect(JSON.stringify(context.profile)).not.toContain('Jane Doe')
  })

  it('is null when the person has not filled in a profile yet', async () => {
    const context = await assembleChatContext(fakeDashboard(), 'u1', { filters: {}, sort: 'newest' })
    expect(context.profile).toBeNull()
  })

  it('scores for match only when the sort actually is match', async () => {
    const dashboard = fakeDashboard({ profile: { skills: ['react'] } })
    await assembleChatContext(dashboard, 'u1', { filters: {}, sort: 'newest' })
    expect(dashboard.listPostingsForUser).toHaveBeenCalledWith('u1', expect.objectContaining({ profile: undefined }))
  })

  it('never lets the request body stand in for the store: filters, sort and an id only say where to look', async () => {
    const dashboard = fakeDashboard({ postings: [row(1)] })
    // A field like `postings` the way a tampered client might send is simply
    // not part of the options this function destructures, so it is never read.
    const context = await assembleChatContext(dashboard, 'u1', { filters: {}, sort: 'match', postings: [row(99)] })
    expect(dashboard.listPostingsForUser).toHaveBeenCalledWith('u1', expect.objectContaining({ sort: 'match' }))
    expect(context.top.map((p) => p.id)).toEqual(['p1'])
  })
})
