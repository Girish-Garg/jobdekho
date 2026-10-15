import { describe, it, expect } from 'vitest'
import { mailFromEnvelope, withBody, htmlText } from '@jobdekho/server/mail-scan/parse.js'
import { worthReading } from '@jobdekho/server/mail-scan/prefilter.js'
import { readKind } from '@jobdekho/server/mail-scan/kinds.js'
import { companyOf, roleOf } from '@jobdekho/server/mail-scan/company.js'
import { groupMails } from '@jobdekho/server/mail-scan/group.js'
import { jobMailQuery } from '@jobdekho/server/mail-scan/query.js'
import { message } from './fixtures/mailbox.js'
import { JOB_MAILS, PROMO_MAILS, ME } from './fixtures/job-mails.js'

const read = async (mail) => {
  const raw = message(mail)
  return withBody(mailFromEnvelope(raw, ME), raw.source)
}
const byId = (id) => JOB_MAILS.find((mail) => mail.id === id)
const ACME_THREAD = { inThread: true }

describe('reading one mail', () => {
  it('takes the headers, the opening text, and knows the person own mail', async () => {
    const mail = await read(byId('me1@acme'))
    expect(mail).toMatchObject({ id: '<me1@acme>', threadId: 'acme', mine: true, subject: 'Application for Backend intern', to: ['priya@acmelabs.example'] })
    expect(mail.text).toMatch(/^Hi Priya, I would like to apply/)
    expect(htmlText('<p>Hi&nbsp;there</p><script>x()</script><div>Next</div>').replace(/\s+/g, ' ').trim()).toBe('Hi there Next')
  })
})

describe('what a job mail says', () => {
  const cases = [
    ['gh1@globex', 'applied', 'Globex', ''],
    ['iv1@globex', 'interview', 'Globex', 'Frontend Developer'],
    ['lv1@initech', 'applied', 'Initech', ''],
    ['hr1@initech', 'assessment', 'Initech', ''],
    ['lv2@initech', 'rejected', 'Initech', ''],
    ['wd1@stark', 'offer', 'Stark Labs', 'Backend Developer'],
    ['li1@umbrella', 'applied', 'Umbrella Health', ''],
    ['me1@acme', 'applied', 'Acmelabs', 'Backend intern'],
  ]
  for (const [id, kind, company, role] of cases) {
    it(`reads ${id} as ${kind} at ${company}`, async () => {
      const mail = await read(byId(id))
      const found = readKind(mail)
      expect(found).toMatchObject({ kind, sure: true })
      expect(companyOf(mail, found.sender)).toBe(company)
      expect(roleOf(mail)).toBe(role)
    })
  }

  it('reads a person answering in the thread the person wrote in as a reply, filed by the domain', async () => {
    const mail = await read(byId('pr1@acme'))
    expect(readKind(mail)).toBeNull()
    const found = readKind(mail, ACME_THREAD)
    expect(found).toMatchObject({ kind: 'replied', sure: true })
    expect(companyOf(mail, found.sender)).toBe('Acmelabs')
  })

  it('leaves the noise out: alerts and bank mail on the subject, a club with no job in it, a board tips mail', async () => {
    expect(worthReading(await read(byId('nk1@alert')))).toBe(false)
    expect(worthReading(await read(byId('bk1@bank')))).toBe(false)
    expect(readKind(await read(byId('cl1@club')))).toBeNull()
    expect(readKind(await read(byId('nk2@tips')))).toBeNull()
    const boardNews = await read({ id: 'x0', from: 'Naukri <info@naukri.com>', subject: 'Your interview schedule this week', date: '2026-10-01', text: 'Your interview is scheduled.' })
    expect(readKind(boardNews)).toMatchObject({ kind: 'interview', sure: false })
  })

  it('files none of what a real first scan took wrongly: news, courses, digests, prep and newsletters', async () => {
    for (const raw of PROMO_MAILS) {
      const mail = await read(raw)
      const found = readKind(mail)
      expect([raw.id, found?.sure ?? false]).toEqual([raw.id, false])
    }
  })

  it('knows mail sent to a list by its headers', async () => {
    expect((await read(PROMO_MAILS[0])).bulk).toBe(true)
    expect((await read(byId('gh1@globex'))).bulk).toBe(false)
  })

  it('does not take a rescheduled interview for a rejection, nor a promise of one for an invite', async () => {
    const reschedule = await read({ id: 'x1', from: 'Globex <talent@globex.example>', subject: 'Your interview with Globex', date: '2026-10-01', text: 'Unfortunately we must reschedule your interview to Monday.' })
    expect(readKind(reschedule)).toMatchObject({ kind: 'interview' })
    const received = await read({ id: 'x2', from: 'Globex <no-reply@us.greenhouse-mail.io>', subject: 'Application received', date: '2026-10-01', text: 'We have received your application. If shortlisted, we will contact you for an interview.' })
    expect(readKind(received)).toMatchObject({ kind: 'applied' })
  })
})

describe('gathering mails into applications', () => {
  it('makes one application per company and role, a thread kept together', async () => {
    const mails = []
    for (const raw of JOB_MAILS.slice(0, 9)) {
      const mail = await read(raw)
      const found = readKind(mail, { inThread: mail.threadId === 'acme' })
      mails.push({ ...mail, ...found, company: companyOf(mail, found.sender), role: roleOf(mail) })
    }
    const groups = groupMails(mails)
    expect(groups.map((g) => [g.company, g.mails.map((m) => m.kind)])).toEqual([
      ['Globex', ['applied', 'interview']],
      ['Initech', ['applied', 'assessment', 'rejected']],
      ['Umbrella Health', ['applied']],
      ['Acmelabs', ['applied', 'replied']],
      ['Stark Labs', ['offer']],
    ])
    expect(groups.find((g) => g.company === 'Acmelabs').contact).toEqual({ name: 'Priya', email: 'priya@acmelabs.example' })
  })
})

describe('the Gmail search', () => {
  it('asks Gmail for job mail only, from a day when given, and the replies to mails sent', () => {
    const query = jobMailQuery({ after: '2026-10-13T08:00:00Z', subjects: ['Backend internship at "Acme"'] })
    expect(query).toMatch(/^\{subject:\(application OR /)
    expect(query).toContain('from:(greenhouse.io OR ')
    expect(query).toContain('subject:("Backend internship at Acme")')
    expect(query).toMatch(/-category:promotions -category:social -in:chats -in:spam -in:trash after:2026\/10\/13$/)
    expect(jobMailQuery()).not.toContain('after:')
  })
})
