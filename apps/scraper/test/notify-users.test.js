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
    prefs: { channel: 'telegram', telegramChatId: 'chat123', enabled: true },
  },
  {
    userId: 'no-match-user',
    filters: { includeKeywords: ['chef'], excludeKeywords: [], locations: ['remote'] },
    prefs: { channel: 'telegram', telegramChatId: 'chat456', enabled: true },
  },
  {
    userId: 'none-user',
    filters: null,
    prefs: { channel: 'none', telegramChatId: null, enabled: true },
  },
]

describe('notifyUsers', () => {
  it('sends only to matching telegram users', async () => {
    const senders = {
      telegram: vi.fn(async () => ({ ok: true })),
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

    // none-user has channel 'none' so is not delivered to even with matches
    const noneEntry = summary.find((s) => s.userId === 'none-user')
    expect(noneEntry).toMatchObject({ userId: 'none-user', sent: false, count: 1 })
  })

  it('reports sent:false when sender returns ok:false', async () => {
    const senders = {
      telegram: vi.fn(async () => ({ ok: false })),
    }
    const summary = await notifyUsers(freshPostings, { users, defaultRules, senders })

    const tgEntry = summary.find((s) => s.userId === 'tg-user')
    expect(tgEntry).toMatchObject({ userId: 'tg-user', sent: false, count: 1 })
  })

  it('returns all users in summary even if none match', async () => {
    const senders = {
      telegram: vi.fn(async () => ({ ok: true })),
    }
    const summary = await notifyUsers([], { users, defaultRules, senders })
    expect(summary).toHaveLength(users.length)
    expect(summary.every((s) => s.sent === false && s.count === 0)).toBe(true)
  })
})
