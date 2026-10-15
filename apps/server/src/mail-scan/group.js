import { compactKey, words } from '@jobdekho/core/company-key.js'
import { isNoReply } from './senders.js'

// Read mails gathered into applications, one per company and role:
//
//   [{ company, role, contact, mails: [mail, ...oldest first] }]
//
// A thread is one application whatever its mails say, so a recruiter's
// "Re: next steps" takes the company of the first mail in it. A mail that
// names no role joins the application at that company it most likely
// belongs to: the only one, else the newest one begun before it. A mail
// with no company is left out (it cannot be filed anywhere certain).
const roleKey = (role) => words(role).join(' ')

function threaded(mails) {
  const known = new Map()
  for (const mail of mails) if (mail.threadId && mail.company && !known.has(mail.threadId)) known.set(mail.threadId, mail)
  return mails.map((mail) => {
    const first = mail.threadId ? known.get(mail.threadId) : null
    return first ? { ...mail, company: first.company, role: first.role || mail.role } : mail
  })
}

// Who to write to about it: a person who wrote, else whom the person wrote to.
function contactOf(mails) {
  const person = mails.find((mail) => !mail.mine && !isNoReply(mail.from.address) && mail.sender?.kind !== 'board')
  if (person) return { name: person.from.name, email: person.from.address }
  const mine = mails.find((mail) => mail.mine && mail.to[0] && !isNoReply(mail.to[0]))
  return mine ? { name: '', email: mine.to[0] } : null
}

export function groupMails(mails) {
  const sorted = threaded([...mails].sort((a, b) => (a.date < b.date ? -1 : 1))).filter((mail) => mail.company)
  const groups = []
  const byKey = new Map()
  for (const mail of sorted) {
    const company = compactKey(mail.company)
    const role = roleKey(mail.role)
    let group = role ? byKey.get(`${company}|${role}`) : null
    if (!group && !role) {
      const same = groups.filter((one) => one.key === company)
      group = same.length === 1 ? same[0] : same.filter((one) => one.mails[0].date <= mail.date).at(-1) ?? same.at(-1) ?? null
    }
    if (!group && role) {
      group = groups.find((one) => one.key === company && !one.roleKey) ?? null
      if (group) Object.assign(group, { role: mail.role, roleKey: role })
    }
    if (!group) {
      group = { key: company, roleKey: role, company: mail.company, role: mail.role, mails: [] }
      groups.push(group)
    }
    if (role) byKey.set(`${company}|${role}`, group)
    group.mails.push(mail)
  }
  return groups.map(({ company, role, mails: list }) => ({ company, role, contact: contactOf(list), mails: list }))
}
