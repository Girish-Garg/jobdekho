import { describe, it, expect, vi } from 'vitest'
import { formatPosting, formatBatch, formatOverflow, chunk, packBatches, TELEGRAM_MESSAGE_LIMIT } from '@jobdekho/notify/format.js'
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
  it('tags the level when it is worth calling out', () => {
    expect(formatPosting({ ...post, level: 'staff' })).toContain('[staff]')
    expect(formatPosting({ ...post, level: 'mid' })).not.toContain('[mid]')
  })
  it('states the remainder when the batch is capped', () => {
    expect(formatOverflow(70)).toContain('70 more')
  })
  it('joins a batch without em dashes', () => {
    expect(formatBatch([post, post])).not.toContain('—')
  })
})

describe('packBatches', () => {
  // 30 of these push formatBatch's joined text past 4096; a fixed
  // postings-per-message count would have missed that this format is the one
  // that overflows.
  const big = (i) => ({
    title: `Software Engineer ${'X'.repeat(100)} ${i}`,
    company: 'Acme Corporation International', location: 'Remote',
    url: `https://example.com/jobs/${i}`,
  })

  it('keeps every batch under the Telegram limit', () => {
    const items = Array.from({ length: 30 }, (_, i) => big(i))
    const batches = packBatches(items)
    expect(batches.length).toBeGreaterThan(1)
    expect(batches.flat()).toHaveLength(30)
    for (const b of batches) expect(formatBatch(b).length).toBeLessThanOrEqual(TELEGRAM_MESSAGE_LIMIT)
  })

  it('packs everything into one batch when it comfortably fits', () => {
    const batches = packBatches([post, post, post])
    expect(batches).toEqual([[post, post, post]])
  })

  it('sends an oversized single posting alone rather than dropping it', () => {
    const huge = { ...post, title: 'X'.repeat(5000) }
    expect(packBatches([huge])).toEqual([[huge]])
  })

  it('returns nothing for an empty list', () => {
    expect(packBatches([])).toEqual([])
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

  // A bare { ok: false } was indistinguishable from a dead chat id or a
  // rejected message body (e.g. the 4096-char overflow), which is why the
  // per-user send failing stayed invisible.
  it('carries the status and Telegram description on failure', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false, status: 400,
      json: async () => ({ ok: false, error_code: 400, description: 'Bad Request: message is too long' }),
    }))
    const r = await sendTelegram({ token: 't', chatId: 'c' }, 'hi', fetchImpl)
    expect(r).toEqual({ ok: false, status: 400, description: 'Bad Request: message is too long' })
  })

  it('tolerates a failure body that is not valid JSON', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false, status: 502, json: async () => { throw new Error('not json') },
    }))
    const r = await sendTelegram({ token: 't', chatId: 'c' }, 'hi', fetchImpl)
    expect(r).toEqual({ ok: false, status: 502, description: undefined })
  })
})
