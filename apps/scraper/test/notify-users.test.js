import { describe, it, expect, vi } from 'vitest'
import { notifyUsers } from '../src/notify-users.js'

const defaultRules = {
  includeKeywords: ['software'], excludeKeywords: [], locations: ['remote'], internshipOnly: true,
}

const freshPostings = [
  { id: '1', title: 'Software Intern', company: 'Acme', location: 'Remote', url: 'u1',
    descriptionSnippet: 'software internship', tags: [] },
  { id: '2', title: 'Chef', company: 'Cafe', location: 'Remote', url: 'u2',
    descriptionSnippet: 'cooking food', tags: [] },
]

const users = [
  {
    userId: 'tg-user',
    filters: { includeKeywords: ['software'], excludeKeywords: [], locations: ['remote'] },
    prefs: { channel: 'telegram', telegramChatId: 'chat123', email: null, enabled: true },
  },
  {
    userId: 'no-match-user',
    filters: { includeKeywords: ['chef'], excludeKeywords: [], locations: ['remote'] },
    prefs: { channel: 'telegram', telegramChatId: 'chat456', email: null, enabled: true },
  },
  {
    userId: 'email-user',
    filters: null,
    prefs: { channel: 'email', telegramChatId: null, email: 'user@example.com', enabled: true },
  },
]

describe('notifyUsers', () => {
  it('sends only to matching users on the right channel', async () => {
    const senders = {
      telegram: vi.fn(async () => ({ ok: true })),
      email: vi.fn(async () => ({ ok: true })),
    }
    const summary = await notifyUsers(freshPostings, { users, defaultRules, senders })

    // tg-user matches Software Intern
    const tgEntry = summary.find((s) => s.userId === 'tg-user')
    expect(tgEntry).toMatchObject({ userId: 'tg-user', sent: true, count: 1 })
    expect(senders.telegram).toHaveBeenCalledWith('chat123', expect.stringContaining('Software Intern'))

    // no-match-user filter (chef) doesn't match either posting
    const noMatch = summary.find((s) => s.userId === 'no-match-user')
    expect(noMatch).toMatchObject({ userId: 'no-match-user', sent: false, count: 0 })
    expect(senders.telegram).not.toHaveBeenCalledWith('chat456', expect.anything())

    // email-user has null filters => uses defaultRules (includeKeywords:software)
    // defaultRules only matches Software Intern, so count=1
    const emailEntry = summary.find((s) => s.userId === 'email-user')
    expect(emailEntry).toMatchObject({ userId: 'email-user', sent: true, count: 1 })
    expect(senders.email).toHaveBeenCalledWith('user@example.com', expect.stringContaining('Software Intern'))
  })

  it('reports sent:false when sender returns ok:false (unconfigured channel)', async () => {
    const senders = {
      telegram: vi.fn(async () => ({ ok: false })),
      email: vi.fn(async () => ({ ok: false })),
    }
    const summary = await notifyUsers(freshPostings, { users, defaultRules, senders })

    const tgEntry = summary.find((s) => s.userId === 'tg-user')
    expect(tgEntry).toMatchObject({ userId: 'tg-user', sent: false, count: 1 })

    const emailEntry = summary.find((s) => s.userId === 'email-user')
    expect(emailEntry).toMatchObject({ userId: 'email-user', sent: false, count: 1 })
  })

  it('returns all users in summary even if none match', async () => {
    const senders = {
      telegram: vi.fn(async () => ({ ok: true })),
      email: vi.fn(async () => ({ ok: true })),
    }
    const summary = await notifyUsers([], { users, defaultRules, senders })
    expect(summary).toHaveLength(users.length)
    expect(summary.every((s) => s.sent === false && s.count === 0)).toBe(true)
  })
})
