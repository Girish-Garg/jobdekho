import { describe, it, expect, vi } from 'vitest'
import { sendEmail } from '@jobdekho/notify/email.js'

describe('sendEmail', () => {
  it('calls transport.sendMail with to, subject, text', async () => {
    const transport = { sendMail: vi.fn(async () => {}) }
    const result = await sendEmail({ to: 'a@b.com', subject: 'Test', text: 'hello' }, transport)
    expect(transport.sendMail).toHaveBeenCalledWith({ to: 'a@b.com', subject: 'Test', text: 'hello' })
    expect(result).toEqual({ ok: true })
  })

  it('returns ok:false when transport.sendMail throws', async () => {
    const transport = { sendMail: vi.fn(async () => { throw new Error('smtp fail') }) }
    const result = await sendEmail({ to: 'a@b.com', subject: 'Test', text: 'hello' }, transport)
    expect(result).toEqual({ ok: false })
  })
})
