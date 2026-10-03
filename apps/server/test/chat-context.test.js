import { describe, it, expect, vi } from 'vitest'
import { assembleChatContext } from '@jobdekho/server/chat/context.js'

const row = (n) => ({ id: `p${n}`, title: `Job ${n}`, company: 'Acme', location: 'Pune', level: 'mid', fit: 50 + n, grade: 'B' })

function fakeDashboard({ postings = [], profile = null, open = null, saved = [], companies = [] } = {}) {
  return {
    listCompanies: vi.fn().mockResolvedValue(companies),
    getProfile: vi.fn().mockResolvedValue(profile),
    listPostingsForUser: vi.fn().mockResolvedValue(postings),
    getPosting: vi.fn().mockResolvedValue(open),
    listAiResults: vi.fn().mockResolvedValue(saved),
  }
}

// Razorpay is scraped under its legal name; a row from another company
// whose title mentions it must not be counted as one of its openings.
const RAZORPAY = 'Razorpay Software Private Limited'
const rzp = (n) => ({ id: `r${n}`, title: `Backend Engineer ${n}`, company: RAZORPAY, location: 'Bengaluru', level: 'mid', fit: 70 - n, grade: 'A' })
const MENTION = { id: 'x1', title: 'Payments engineer (ex-Razorpay welcome)', company: 'Acme', location: 'Pune', level: 'mid', fit: 60, grade: 'B' }

describe('assembleChatContext: companies the question names', () => {
  it('looks their openings up across the whole corpus, whatever the feed shows', async () => {
    const dashboard = fakeDashboard({ companies: [RAZORPAY, 'Acme'], profile: { skills: ['node'] } })
    dashboard.listPostingsForUser.mockImplementation(async (_u, opts) => (opts.q === 'razorpay' ? [...Array.from({ length: 18 }, (_, i) => rzp(i)), MENTION] : [row(1)]))
    const context = await assembleChatContext(dashboard, 'u1', { filters: { q: 'react' }, sort: 'newest', question: "Is Razorpay's team hiring backend engineers?" })
    expect(dashboard.listPostingsForUser).toHaveBeenCalledWith('u1', expect.objectContaining({ q: 'razorpay', sort: 'match', includeStale: true, limit: 1000 }))
    expect(context.named).toHaveLength(1)
    expect(context.named[0].company).toBe(RAZORPAY)
    expect(context.named[0].openCount).toBe(18)
    expect(context.named[0].notSeenRecently).toBe(0)
    expect(context.named[0].postings).toHaveLength(15)
    expect(context.named[0].postings[0]).toEqual({ id: 'r0', title: 'Backend Engineer 0', company: RAZORPAY, location: 'Bengaluru', level: 'mid', workMode: null, pay: null, fit: 70, grade: 'A' })
    expect(context.named[0].postings.map((p) => p.id)).not.toContain('x1')
  })

  // The feed hides a posting unlisted for three weeks; asking without those
  // turned "ten postings, last seen in August" into "none", which is false.
  it('keeps stale postings, after the fresh ones, marked with the day they were last seen', async () => {
    const now = Date.parse('2026-09-30T00:00:00.000Z')
    const dashboard = fakeDashboard({ companies: ['Razorpaysoftwareprivatelimited'] })
    dashboard.listPostingsForUser.mockImplementation(async (_u, opts) => (opts.q === 'razorpay'
      ? [{ ...rzp(1), company: 'Razorpaysoftwareprivatelimited', lastSeenAt: '2026-08-24T20:14:48.079Z' }, { ...rzp(2), company: 'Razorpaysoftwareprivatelimited', lastSeenAt: '2026-09-28T00:00:00.000Z' }]
      : []))
    const { named } = await assembleChatContext(dashboard, 'u1', { filters: {}, sort: 'match', question: 'Is Razorpay hiring?', now })
    expect(named[0]).toMatchObject({ company: 'Razorpaysoftwareprivatelimited', openCount: 1, notSeenRecently: 1 })
    expect(named[0].postings.map((p) => [p.id, p.notSeenSince])).toEqual([['r2', undefined], ['r1', '2026-08-24']])
  })

  it('names nothing, and asks the store for nothing more, when the question names no company', async () => {
    const dashboard = fakeDashboard({ companies: [RAZORPAY, 'Acme'] })
    const context = await assembleChatContext(dashboard, 'u1', { filters: {}, sort: 'match', question: 'Which of these fit me best?' })
    expect(context.named).toEqual([])
    expect(dashboard.listPostingsForUser).toHaveBeenCalledTimes(1)
  })
})

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

  // The screen scores under every order (the fit floor and the grades hold
  // under Newest too), so the chat's view of it has to as well.
  it('scores under every sort, as the feed does', async () => {
    const profile = { skills: ['react'] }
    const dashboard = fakeDashboard({ profile })
    await assembleChatContext(dashboard, 'u1', { filters: {}, sort: 'newest' })
    expect(dashboard.listPostingsForUser).toHaveBeenCalledWith('u1', expect.objectContaining({ sort: 'newest', profile }))
  })

  it('has nothing blocked with a dashboard that predates blocking', async () => {
    const context = await assembleChatContext(fakeDashboard(), 'u1', { filters: {}, sort: 'match' })
    expect(context.blocked).toEqual([])
  })

  it('never lets the request body stand in for the store: filters and sort only say where to look', async () => {
    const dashboard = fakeDashboard({ postings: [row(1)] })
    // A field like `postings` the way a tampered client might send is simply
    // not part of the options this function destructures, so it is never read.
    const context = await assembleChatContext(dashboard, 'u1', { filters: {}, sort: 'match', postings: [row(99)] })
    expect(dashboard.listPostingsForUser).toHaveBeenCalledWith('u1', expect.objectContaining({ sort: 'match' }))
    expect(context.top.map((p) => p.id)).toEqual(['p1'])
  })
})

// The store already leaves a blocked company out of every list read here;
// what is left is to name the blocked ones, and to keep them out of the
// companies a question names. A chat's own jobs are kept out of it in
// chat-items-context.js.
describe('assembleChatContext and blocked companies', () => {
  const withBlocked = (dashboard, entries) => Object.assign(dashboard, { listBlockedCompanies: vi.fn().mockResolvedValue(entries) })
  const ACME = { key: 'acmefoundation', name: 'Acme Foundation' }

  it('names the blocked companies, so an answer can say one is blocked', async () => {
    const dashboard = withBlocked(fakeDashboard(), [ACME])
    const context = await assembleChatContext(dashboard, 'u1', { filters: {}, sort: 'match' })
    expect(dashboard.listBlockedCompanies).toHaveBeenCalledWith('u1')
    expect(context.blocked).toEqual(['Acme Foundation'])
  })

  // Looked up, it could only come back empty, and read as "not hiring".
  it('does not look up a blocked company the question names', async () => {
    const dashboard = withBlocked(fakeDashboard({ companies: [RAZORPAY, 'Acme'] }), [{ key: 'razorpay', name: 'Razorpay' }])
    const context = await assembleChatContext(dashboard, 'u1', { filters: {}, sort: 'match', question: 'Is Razorpay hiring? And Acme?' })
    expect(context.named.map((n) => n.company)).toEqual(['Acme'])
    expect(dashboard.listPostingsForUser).not.toHaveBeenCalledWith('u1', expect.objectContaining({ q: 'razorpay' }))
  })
})
