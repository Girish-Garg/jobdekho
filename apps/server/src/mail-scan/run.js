import { getMailAccount, recentSubjects } from '@jobdekho/store/mail-log.js'
import { getScanState, noteScan } from '@jobdekho/store/mail-scan-state.js'
import { MailError } from '../mail/gmail.js'
import { openGmail } from './mailbox.js'
import { jobMailQuery } from './query.js'
import { mailFromEnvelope, withBody } from './parse.js'
import { worthReading } from './prefilter.js'
import { readKind } from './kinds.js'
import { companyOf, roleOf } from './company.js'
import { groupMails } from './group.js'
import { getMailLessons } from '@jobdekho/store/mail-labels.js'
import { compactKey } from '@jobdekho/core/company-key.js'

// One scan of the person's Gmail into the Tracker. The first reads the whole
// mailbox; each one after reads from two days before the last, so a day
// JobDekho was closed is caught up when it opens, and the overlap is
// harmless: mails already read are known by id (see the store's
// mail-scan-state.js) and a Tracker line by its mail (tracker-scan.js).
//
// Only mails the rules are sure of are filed; the rest are counted as
// `unsure` for what reads them later. `progress` hears each step.
const OVERLAP_MS = 2 * 24 * 60 * 60 * 1000
const LOST = 'JobDekho could not read the saved app password. Connect Gmail again in Settings.'

const SAYS = {
  applied: (mail) => (mail.byYou ? 'You applied by mail' : mail.sender.kind === 'board' ? `Applied on ${mail.sender.label}` : 'Application received'),
  replied: (mail) => `${mail.from.name || 'They'} replied`,
  assessment: () => 'Test or assignment',
  interview: () => 'Interview',
  offer: () => 'Offer',
  rejected: () => 'Not moving forward',
}

const fromLabel = (mail) => (mail.sender.label ? `${mail.sender.label} mail` : mail.mine ? 'Your mail' : `Mail from ${mail.sender.domain}`)

// The Tracker's shape for a group (see the store's tracker-scan.js).
const filed = (group) => ({
  ...group,
  mails: group.mails.map((mail) => ({
    id: mail.id, date: mail.date, kind: mail.kind, from: fromLabel(mail), sender: mail.sender.domain, via: mail.mine ? 'you' : mail.sender.kind,
    text: `${SAYS[mail.kind](mail)}${mail.subject ? `: ${mail.subject}` : ''}`,
  })),
})

async function readMailbox(box, { query, me, seen, progress }) {
  progress({ step: 'searching' })
  const heads = []
  for await (const message of box.envelopes(await box.search(query))) {
    const mail = mailFromEnvelope(message, me)
    if (!seen.has(mail.id) && worthReading(mail)) heads.push(mail)
  }
  const byUid = new Map(heads.map((mail) => [mail.uid, mail]))
  const read = []
  progress({ step: 'reading', total: heads.length, read: 0 })
  for await (const message of box.bodies([...byUid.keys()])) {
    read.push(await withBody(byUid.get(message.uid), message.source))
    if (read.length % 20 === 0) progress({ step: 'reading', total: heads.length, read: read.length })
  }
  return read
}

// Read each mail, leaving out what the person said is never an
// application: a sender, or a company (see the store's mail-labels.js).
function sort(mails, lessons) {
  const theirs = new Set(mails.filter((mail) => mail.mine && mail.threadId).map((mail) => mail.threadId))
  const sure = []
  let unsure = 0
  for (const mail of mails) {
    const found = readKind(mail, { inThread: Boolean(mail.threadId && theirs.has(mail.threadId)) })
    if (!found || lessons.domains.has(found.sender.domain)) continue
    const company = companyOf(mail, found.sender)
    if (lessons.companies.has(compactKey(company))) continue
    if (!found.sure) unsure += 1
    else sure.push({ ...mail, kind: found.kind, sender: found.sender, byYou: found.byYou, company, role: roleOf(mail) })
  }
  return { sure, unsure }
}

export async function scanMail({ store, secrets, dashboard, userId, open = openGmail, now = () => new Date(), progress = () => {} }) {
  const account = getMailAccount(store, userId)
  if (!account) throw new MailError('Connect Gmail in Settings first.')
  const password = await secrets.read(account.address, account.keptIn)
  if (!password) throw new MailError(LOST)
  const state = getScanState(store, userId)
  const after = state.lastAt ? new Date(Date.parse(state.lastAt) - OVERLAP_MS) : null
  const query = jobMailQuery({ after, subjects: recentSubjects(store, userId, now()) })
  const box = await open({ address: account.address, password })
  try {
    const mails = await readMailbox(box, { query, me: account.address, seen: new Set(state.seen), progress })
    const { sure, unsure } = sort(mails, getMailLessons(store, userId))
    const groups = groupMails(sure).map(filed)
    progress({ step: 'filing' })
    const outcome = await dashboard.applyMailScan(userId, groups)
    noteScan(store, userId, { at: now(), seen: mails.map((mail) => mail.id), found: groups.length, unsure })
    return { ...outcome, read: mails.length, found: groups.length, unsure }
  } finally {
    await box.close()
  }
}
