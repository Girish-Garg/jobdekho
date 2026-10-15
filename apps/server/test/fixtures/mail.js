import { vi } from 'vitest'

// Stand-ins for the mail seams (see mail/deps.js): a keeper that holds the
// app password in memory, and a nodemailer createTransport that records
// what it was asked and never reaches Gmail.
export function memorySecrets() {
  const kept = new Map()
  return {
    kept,
    keep: vi.fn(async (address, secret) => { kept.set(address, secret); return 'windows' }),
    read: vi.fn(async (address) => kept.get(address) ?? null),
    forget: vi.fn(async (address) => { kept.delete(address) }),
  }
}

export function fakeTransport({ verify = async () => true, send = async () => ({ messageId: '<m1@example.com>' }) } = {}) {
  const made = []
  const make = vi.fn((options) => {
    const mailer = { options, verify: vi.fn(verify), sendMail: vi.fn(send), close: vi.fn() }
    made.push(mailer)
    return mailer
  })
  return { make, made }
}
