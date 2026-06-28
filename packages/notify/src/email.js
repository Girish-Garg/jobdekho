import nodemailer from 'nodemailer'

export async function sendEmail({ to, from, subject, text }, transport) {
  try {
    await transport.sendMail({ to, from, subject, text })
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

export function createTransport(config) {
  return nodemailer.createTransport(config)
}
