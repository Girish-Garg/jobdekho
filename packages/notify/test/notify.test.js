import { describe, it, expect, vi } from 'vitest'
import { formatPosting, formatBatch, chunk } from '@jobdekho/notify/format.js'
import { sendTelegram } from '@jobdekho/notify/telegram.js'

const post = { title: 'SDE Intern', company: 'Acme', location: 'Remote', url: 'https://x/1' }

describe('format', () => {
  it('formats a posting with no em dashes', () => {
    const s = formatPosting(post)
    expect(s).toContain('SDE Intern')
    expect(s).toContain('https://x/1')
    expect(s).not.toContain('—')
  })
  it('chunks arrays', () => {
    expect(chunk([1, 2, 3], 2)).toEqual([[1, 2], [3]])
  })
})

describe('sendTelegram', () => {
  it('skips when not configured', async () => {
    expect(await sendTelegram({}, 'hi')).toEqual({ ok: false, skipped: true })
  })
  it('posts to the bot API when configured', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }))
    const r = await sendTelegram({ token: 't', chatId: 'c' }, 'hi', fetchImpl)
    expect(r.ok).toBe(true)
    expect(fetchImpl.mock.calls[0][0]).toContain('/bott/sendMessage')
  })
})
