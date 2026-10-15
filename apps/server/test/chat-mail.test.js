import { describe, it, expect, afterEach } from 'vitest'
import { upsertProfile } from '@jobdekho/store/profiles.js'
import { createDocument } from '@jobdekho/store/documents.js'
import { saveMailAccount, logSentMail } from '@jobdekho/store/mail-log.js'
import { listTracker } from '@jobdekho/store/tracker.js'
import { chatApp, answeringCli, posting, cleanUp } from './fixtures/chat-app.js'
import { memorySecrets, fakeTransport } from './fixtures/mail.js'

afterEach(cleanUp)

// Made-up people and addresses only; the fake transport never reaches Gmail.
const TO = 'priya@acmelabs.example'
const ASK = `Email ${TO}, she is the founder of Acme Labs. Backend internship, I saw her post about the payments rewrite.`
const TEX = '\\documentclass{article}\n\\begin{document}\nJane Doe\n\\end{document}\n'
const DRAFT = { to: TO, name: 'Priya', company: 'Acme Labs', role: 'Backend intern', subject: 'Backend internship at Acme Labs', body: 'Hi Priya,\n\nI read your post.\n\n\n\nThanks,\nJane' }
const mailReply = (mail = DRAFT) => () => ({ reply: 'The draft is below.', mail })

async function setup({ answer = mailReply(), connected = true, postings = [] } = {}) {
  const cli = answeringCli(answer)
  const secrets = memorySecrets()
  const transport = fakeTransport()
  const doc = {}
  const app = await chatApp({
    cli: cli.cli,
    postings,
    seed: async (store, userId) => {
      await upsertProfile(store, userId, { basics: { name: 'Jane Doe' }, skills: ['node'], projects: [{ id: 'p1', title: 'Ledger', startDate: '2025' }] })
      Object.assign(doc, await createDocument(store, userId, { name: 'Jane Doe Resume', kind: 'resume', templateId: 'classic', tex: TEX, by: 'template' }))
      if (connected) {
        saveMailAccount(store, userId, { address: 'jane@example.com', keptIn: 'windows' })
        secrets.kept.set('jane@example.com', 'abcdefghijklmnop')
      }
    },
    decorate: (instance, store) => {
      instance.decorate('mailStore', store)
      instance.decorate('mailSecrets', secrets)
      instance.decorate('mailTransport', transport.make)
      instance.decorate('resumeCompile', async () => ({ pdf: Buffer.from('%PDF-1.4 made up') }))
    },
  })
  const chat = await app.newChat()
  const draft = async (message = ASK, id = chat.id) => (await app.ask(id, message)).json().proposals.at(-1)
  const send = (proposal) => app.call('POST', `/api/chat/proposals/${proposal.id}/apply`)
  const edit = (proposal, body) => app.call('PATCH', `/api/chat/proposals/${proposal.id}/mail`, body)
  return { ...app, cli, secrets, transport, doc, chat, draft, send, edit }
}

describe('a mail the chat drafts', () => {
  it('comes as a card waiting to be sent, written as the person, about the address they typed', async () => {
    const { draft, cli } = await setup()
    const mail = await draft()
    expect(mail).toMatchObject({ kind: 'mail', status: 'pending', summary: 'Mail to Priya', to: TO, company: 'Acme Labs', attach: null, mailedBefore: null })
    expect(mail.body).toBe('Hi Priya,\n\nI read your post.\n\nThanks,\nJane')
    const prompt = cli.prompts()[0].input
    expect(prompt).toContain('"to" must be an address the person typed in this conversation')
    expect(prompt).toContain('"name":"Jane Doe"')
    expect(prompt).toContain('"email":"jane@example.com"')
  })

  it('is refused when the address is not one the person typed', async () => {
    const { draft } = await setup({ answer: mailReply({ ...DRAFT, to: 'founder@acmelabs.example' }) })
    const mail = await draft()
    expect(mail).toMatchObject({ status: 'refused', reason: expect.stringMatching(/only mails an address you typed/) })
  })

  it('is refused for a shorter address inside the one typed', async () => {
    const { draft } = await setup({ answer: mailReply({ ...DRAFT, to: 'priya@acmelabs.example' }) })
    expect((await draft('Email priya@acmelabs.example.com about the internship')).status).toBe('refused')
  })

  it('tells a question that is not about a mail nothing about mail', async () => {
    const { ask, chat, cli } = await setup({ answer: () => ({ reply: 'Two are remote.' }) })
    await ask(chat.id, 'which of these are remote?')
    expect(cli.prompts()[0].input).not.toContain('send mail from JobDekho')
  })

  it('says when the address was mailed before', async () => {
    const { draft, store, userId } = await setup()
    logSentMail(store, userId, { to: TO, subject: 'Earlier' }, new Date('2026-10-01T10:00:00.000Z'))
    expect((await draft()).mailedBefore).toBe('2026-10-01T10:00:00.000Z')
  })

  it('in a job chat, is filed under that job', async () => {
    const { draft, store, userId } = await setup({ answer: mailReply({ ...DRAFT, company: '', role: '' }), postings: [posting('j1', 'Backend intern', 'Acme Labs')] })
    const mail = await draft(ASK, 'job:j1')
    expect(mail).toMatchObject({ postingId: 'j1', company: 'Acme Labs', role: 'Backend intern' })
    expect(listTracker(store, userId)).toHaveLength(0)
  })
})

describe('sending it', () => {
  it('sends the saved draft with the picked resume, logs it, tracks it, and only once', async () => {
    const { draft, send, edit, transport, store, userId, doc } = await setup()
    const mail = await draft()
    expect((await edit(mail, { attach: doc.id, subject: 'Backend internship' })).json().proposal).toMatchObject({ attach: doc.id, attachName: 'Jane Doe Resume' })
    const res = await send(mail)
    expect(res.statusCode).toBe(200)
    const sent = transport.made.at(-1).sendMail.mock.calls[0][0]
    expect(sent).toMatchObject({ from: { name: 'Jane Doe', address: 'jane@example.com' }, to: TO, subject: 'Backend internship', text: mail.body })
    expect(sent.attachments[0]).toMatchObject({ filename: 'Jane-Doe-Resume.pdf', contentType: 'application/pdf' })
    const [entry] = listTracker(store, userId)
    expect(entry).toMatchObject({ company: 'Acme Labs', stage: 'emailed', contact: { email: TO } })
    expect(res.json().proposal).toMatchObject({ status: 'applied', from: 'jane@example.com', messageId: '<m1@example.com>', trackerId: entry.id })
    expect((await send(mail)).json().error).toBe('This mail was already sent.')
    expect((await edit(mail, { subject: 'x' })).statusCode).toBe(409)
    expect(transport.made.filter((m) => m.sendMail.mock.calls.length)).toHaveLength(1)
  })

  it('sends nothing before Gmail is connected', async () => {
    const { draft, send, transport } = await setup({ connected: false })
    const res = await send(await draft())
    expect(res.statusCode).toBe(409)
    expect(res.json().error).toMatch(/Connect Gmail in Settings first/)
    expect(transport.make).not.toHaveBeenCalled()
  })

  it('sets no daily limit of its own, and says so when Gmail says its own is reached', async () => {
    const { draft, send, store, userId, transport } = await setup()
    for (let i = 0; i < 40; i += 1) logSentMail(store, userId, { to: `p${i}@x.example`, subject: 'Hi' })
    expect((await send(await draft())).statusCode).toBe(200)
    transport.make.mockImplementation(() => ({
      sendMail: async () => { throw Object.assign(new Error('limit'), { responseCode: 550, response: '550 5.4.5 Daily user sending limit exceeded' }) },
      close: () => {},
    }))
    const res = await send(await draft('Email priya@acmelabs.example again'))
    expect(res.statusCode).toBe(502)
    expect(res.json().error).toMatch(/Gmail says your account has sent as many mails as it allows for today/)
  })

  it('takes the person own edits, and refuses what is not an address or a document', async () => {
    const { draft, edit } = await setup()
    const mail = await draft()
    expect((await edit(mail, { to: 'Hr@Acme.example' })).json().proposal).toMatchObject({ to: 'hr@acme.example', summary: 'Mail to Priya' })
    expect((await edit(mail, { to: 'not an address' })).statusCode).toBe(400)
    expect((await edit(mail, { attach: 'nope' })).statusCode).toBe(404)
    expect((await edit(mail, { body: '   ' })).statusCode).toBe(400)
  })
})
